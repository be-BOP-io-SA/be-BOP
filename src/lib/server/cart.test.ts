import { describe, beforeEach, it, expect, assert } from 'vitest';
import { collections } from './database';
import { cleanDb } from './test-utils';
import { ObjectId } from 'mongodb';
import { addToCartInDb, restoreFromPendingSnapshot } from './cart';
import { createOrder } from './orders';
// SvelteKit 2 exports `HttpError` as a type only; `isHttpError` is how you recognise one.
import { isHttpError } from '@sveltejs/kit';
import {
	TEST_DIGITAL_PRODUCT,
	TEST_PRODUCT_STOCK,
	TEST_DIGITAL_PRODUCT_UNLIMITED,
	TEST_PHYSICAL_PRODUCT
} from './seed/product';
import { computePriceInfo } from '$lib/cart';
import { toCurrency } from '$lib/utils/toCurrency';

describe('cart', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertMany([TEST_DIGITAL_PRODUCT, TEST_DIGITAL_PRODUCT_UNLIMITED]);
	});

	it('should add a product to the cart', async () => {
		await addToCartInDb(TEST_DIGITAL_PRODUCT, 1, {
			user: {
				sessionId: 'test-session-id'
			},
			mode: 'eshop'
		});

		expect(await collections.carts.countDocuments({ 'user.sessionId': 'test-session-id' })).toBe(1);
	});

	it('should fail to add a product to the cart when no stock', async () => {
		const err = await addToCartInDb(TEST_DIGITAL_PRODUCT, 10, {
			user: {
				sessionId: 'test-session-id'
			},
			mode: 'eshop'
		}).catch((e) => e);

		expect(isHttpError(err)).toBe(true);
	});

	it('should prevent adding a product when reserved by another user', async () => {
		await addToCartInDb(TEST_DIGITAL_PRODUCT, TEST_PRODUCT_STOCK, {
			user: {
				sessionId: 'test-session-id'
			},
			mode: 'eshop'
		});
		const err = await addToCartInDb(TEST_DIGITAL_PRODUCT, TEST_PRODUCT_STOCK, {
			user: {
				sessionId: 'test-session-id2'
			},
			mode: 'eshop'
		}).catch((e) => e);

		expect(isHttpError(err)).toBe(true);
	});

	it('should allow checking out a product when the reservation is expired', async () => {
		await addToCartInDb(TEST_DIGITAL_PRODUCT, TEST_PRODUCT_STOCK, {
			user: {
				sessionId: 'test-session-id'
			},
			mode: 'eshop'
		});
		const cart = await collections.carts.findOne({ 'user.sessionId': 'test-session-id' });
		assert(cart, 'Cart should exist');
		cart.items[0].reservedUntil = new Date(0);
		await collections.carts.updateOne({ _id: cart._id }, { $set: { items: cart.items } });
		await addToCartInDb(TEST_DIGITAL_PRODUCT, TEST_PRODUCT_STOCK, {
			user: {
				sessionId: 'test-session-id2'
			},
			mode: 'eshop'
		});
		// Refresh first cart
		await addToCartInDb(TEST_DIGITAL_PRODUCT_UNLIMITED, 1, {
			user: {
				sessionId: 'test-session-id'
			},
			mode: 'eshop'
		});
		const cart2 = await collections.carts.findOne({ 'user.sessionId': 'test-session-id2' });
		assert(cart2, 'Cart 2 should exist');
		// Second user should be able to check out
		await expect(
			createOrder(
				[
					{
						quantity: TEST_PRODUCT_STOCK,
						product: TEST_DIGITAL_PRODUCT
					}
				],
				'point-of-sale',
				{
					locale: 'en',
					cart: cart2,
					user: {
						sessionId: 'test-session-id2'
					},
					userVatCountry: 'FR',
					shippingAddress: null
				}
			)
		).resolves.toBeDefined();
	});

	describe('pay what you want with variations', () => {
		const PWYW_WITH_SIZES = {
			...TEST_DIGITAL_PRODUCT_UNLIMITED,
			_id: 'test-pwyw-sizes',
			alias: ['test-pwyw-sizes'],
			payWhatYouWant: true,
			variations: [
				{ name: 'size', value: 'S', price: 0 },
				{ name: 'size', value: 'XXL', price: 30 }
			]
		};

		beforeEach(async () => {
			await collections.products.insertOne(PWYW_WITH_SIZES);
		});

		it('floors the chosen price at the base price plus the option surcharge', async () => {
			await addToCartInDb(PWYW_WITH_SIZES, 1, {
				user: { sessionId: 'pwyw-1' },
				mode: 'eshop',
				customPrice: { amount: 100, currency: 'EUR' },
				chosenVariations: { size: 'XXL' }
			});

			const cart = await collections.carts.findOne({ 'user.sessionId': 'pwyw-1' });
			expect(cart?.items[0].customPrice?.amount).toBe(130);
		});

		it('refuses an option the product does not offer', async () => {
			const err = await addToCartInDb(PWYW_WITH_SIZES, 1, {
				user: { sessionId: 'pwyw-2' },
				mode: 'eshop',
				customPrice: { amount: 100, currency: 'EUR' },
				chosenVariations: { size: 'XXXXL' }
			}).catch((e) => e);

			expect(isHttpError(err)).toBe(true);
		});
	});

	describe('typed error codes', () => {
		it('throws OUT_OF_STOCK with body.code when overshooting available stock', async () => {
			try {
				await addToCartInDb(TEST_DIGITAL_PRODUCT, TEST_PRODUCT_STOCK + 1, {
					user: { sessionId: 'codes-1' },
					mode: 'eshop'
				});
				expect.fail('should have thrown');
			} catch (e) {
				const body = (e as { body?: { code?: string; params?: Record<string, unknown> } }).body;
				expect(body?.code).toBe('MAX_PER_ORDER');
				expect(body?.params).toEqual({ max: TEST_PRODUCT_STOCK });
			}
		});

		it('throws OUT_OF_STOCK with body.code when no stock at all is reservable', async () => {
			await addToCartInDb(TEST_DIGITAL_PRODUCT, TEST_PRODUCT_STOCK, {
				user: { sessionId: 'reserver' },
				mode: 'eshop'
			});
			try {
				await addToCartInDb(TEST_DIGITAL_PRODUCT, 1, {
					user: { sessionId: 'codes-2' },
					mode: 'eshop'
				});
				expect.fail('should have thrown');
			} catch (e) {
				const body = (e as { body?: { code?: string } }).body;
				expect(body?.code).toBe('OUT_OF_STOCK');
			}
		});
	});

	describe('restoreFromPendingSnapshot', () => {
		it('rejects a forged snapshot id and leaves the cart untouched', async () => {
			const cartId = new ObjectId();
			const initialItems = [
				{
					_id: 'line-1',
					productId: TEST_DIGITAL_PRODUCT._id,
					quantity: 5,
					customPrice: { amount: 1, currency: 'EUR' as const }
				}
			];
			await collections.carts.insertOne({
				_id: cartId,
				user: { sessionId: 'rb-1' },
				items: initialItems,
				pendingSnapshot: {
					id: '11111111-1111-4111-8111-111111111111',
					items: [{ _id: 'old-line', productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					createdAt: new Date()
				},
				createdAt: new Date(),
				updatedAt: new Date()
			});

			const cart = await collections.carts.findOne({ _id: cartId });
			assert(cart, 'inserted cart');
			const result = await restoreFromPendingSnapshot(cart, 'ffffffff-ffff-4fff-8fff-ffffffffffff');
			expect(result.restored).toBe(false);

			const after = await collections.carts.findOne({ _id: cartId });
			expect(after?.items).toEqual(initialItems);
			expect(after?.pendingSnapshot?.id).toBe('11111111-1111-4111-8111-111111111111');
		});

		it('restores items and clears the snapshot when the id matches', async () => {
			const cartId = new ObjectId();
			const snapshotId = '22222222-2222-4222-8222-222222222222';
			const snapshotItems = [
				{ _id: 'snap-line', productId: TEST_DIGITAL_PRODUCT._id, quantity: 2 }
			];
			await collections.carts.insertOne({
				_id: cartId,
				user: { sessionId: 'rb-2' },
				items: [{ _id: 'new-line', productId: TEST_DIGITAL_PRODUCT._id, quantity: 7 }],
				pendingSnapshot: {
					id: snapshotId,
					items: snapshotItems,
					createdAt: new Date()
				},
				createdAt: new Date(),
				updatedAt: new Date()
			});

			const cart = await collections.carts.findOne({ _id: cartId });
			assert(cart, 'inserted cart');
			const result = await restoreFromPendingSnapshot(cart, snapshotId);
			expect(result.restored).toBe(true);

			const after = await collections.carts.findOne({ _id: cartId });
			expect(after?.items).toEqual(snapshotItems);
			expect(after?.pendingSnapshot).toBeUndefined();
		});
	});

	describe('computePriceInfo', () => {
		describe('when vatExempted is true', () => {
			it('should return the price without VAT', () => {
				const priceInfo = computePriceInfo([{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }], {
					bebopCountry: 'FR',
					deliveryFees: { amount: 0, currency: 'EUR' },
					freeProductUnits: {},
					userCountry: 'CH',
					vatExempted: true,
					vatNullOutsideSellerCountry: false,
					vatProfiles: [],
					vatSingleCountry: false
				});
				expect(priceInfo.totalPriceWithVat).toBe(
					toCurrency(
						priceInfo.currency,
						TEST_DIGITAL_PRODUCT.price.amount,
						TEST_DIGITAL_PRODUCT.price.currency
					)
				);
				expect(priceInfo.totalPrice).toBe(priceInfo.totalPriceWithVat);
				expect(priceInfo.totalVat).toBe(0);
				expect(priceInfo.vat.length).toBe(0);
			});
		});

		describe('when vatNullOutsideSellerCountry is true', () => {
			describe("when the user's country is the same as the seller's country", () => {
				it('should return the price with VAT for physical products', () => {
					const priceInfo = computePriceInfo([{ product: TEST_PHYSICAL_PRODUCT, quantity: 1 }], {
						bebopCountry: 'FR',
						deliveryFees: { amount: 0, currency: 'EUR' },
						freeProductUnits: {},
						userCountry: 'FR',
						vatExempted: false,
						vatNullOutsideSellerCountry: true,
						vatProfiles: [],
						vatSingleCountry: false
					});
					expect(priceInfo.totalPriceWithVat).toBeGreaterThan(priceInfo.totalPrice);
					expect(priceInfo.totalVat).toBeGreaterThan(0);
					expect(priceInfo.vat.length).toBe(1);
					expect(
						toCurrency(
							priceInfo.currency,
							priceInfo.vat[0].price.amount,
							priceInfo.vat[0].price.currency
						)
					).toBe(priceInfo.totalVat);
					expect(priceInfo.vat[0].rate).toBe(20);
					expect(priceInfo.totalPrice).toBe(333333);
					expect(priceInfo.totalPriceWithVat).toBe(400000);
				});
			});

			describe("when the user's country is different from the seller's country", () => {
				it('should return the price with VAT for digital products', () => {
					const priceInfo = computePriceInfo([{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }], {
						bebopCountry: 'FR',
						deliveryFees: { amount: 0, currency: 'EUR' },
						freeProductUnits: {},
						userCountry: 'CH',
						vatExempted: false,
						vatNullOutsideSellerCountry: true,
						vatProfiles: [],
						vatSingleCountry: false
					});

					expect(priceInfo.totalPriceWithVat).toBeGreaterThan(priceInfo.totalPrice);
					expect(priceInfo.totalVat).toBeGreaterThan(0);
					expect(priceInfo.vat.length).toBe(1);
				});

				it('should return the price without VAT for physical products', () => {
					const priceInfo = computePriceInfo([{ product: TEST_PHYSICAL_PRODUCT, quantity: 1 }], {
						bebopCountry: 'FR',
						deliveryFees: { amount: 0, currency: 'EUR' },
						freeProductUnits: {},
						userCountry: 'CH',
						vatExempted: false,
						vatNullOutsideSellerCountry: true,
						vatProfiles: [],
						vatSingleCountry: false
					});
					expect(priceInfo.totalPriceWithVat).toBe(
						toCurrency(
							priceInfo.currency,
							TEST_PHYSICAL_PRODUCT.price.amount,
							TEST_PHYSICAL_PRODUCT.price.currency
						)
					);
					expect(priceInfo.totalPrice).toBe(priceInfo.totalPriceWithVat);
					expect(priceInfo.totalVat).toBe(0);
					expect(priceInfo.vat.length).toBe(0);
				});
			});
		});
	});
});
