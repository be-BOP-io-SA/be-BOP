import { describe, beforeEach, it, expect, assert } from 'vitest';
import { collections } from './database';
import { cleanDb } from './test-utils';
import { addToCartInDb } from './cart';
import { createOrder } from './orders';
import { HttpError_1 } from '@sveltejs/kit';
import {
	TEST_DIGITAL_PRODUCT,
	TEST_PRODUCT_STOCK,
	TEST_DIGITAL_PRODUCT_UNLIMITED,
	TEST_PHYSICAL_PRODUCT
} from './seed/product';
import { computeDeliveryFees, computePriceInfo, freeDeliveryThresholdInfo } from '$lib/cart';
import { toCurrency } from '$lib/utils/toCurrency';
import type { RuntimeConfig } from './runtime-config';

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
		await expect(
			addToCartInDb(TEST_DIGITAL_PRODUCT, 10, {
				user: {
					sessionId: 'test-session-id'
				},
				mode: 'eshop'
			})
		).rejects.toThrow(HttpError_1);
	});

	it('should prevent adding a product when reserved by another user', async () => {
		await addToCartInDb(TEST_DIGITAL_PRODUCT, TEST_PRODUCT_STOCK, {
			user: {
				sessionId: 'test-session-id'
			},
			mode: 'eshop'
		});
		await expect(
			addToCartInDb(TEST_DIGITAL_PRODUCT, TEST_PRODUCT_STOCK, {
				user: {
					sessionId: 'test-session-id2'
				},
				mode: 'eshop'
			})
		).rejects.toThrow(HttpError_1);
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

	describe('computeDeliveryFees', () => {
		const EUR = 'EUR' as const;
		const shippingItem = {
			product: { price: { amount: 10, currency: EUR }, shipping: true },
			quantity: 1
		};
		const baseConfig: RuntimeConfig['deliveryFees'] = {
			mode: 'flatFee',
			applyFlatFeeToEachItem: false,
			onlyPayHighest: false,
			allowFreeForPOS: false,
			vatIncludedReference: false,
			vatProfileId: null,
			freeDeliveryThresholdEnabled: false,
			freeDeliveryThreshold: 0,
			showRemainingForFreeDelivery: true,
			deliveryFees: {},
			deliveryZones: [],
			defaultBlacklist: []
		};
		const withCountryMethods = {
			...baseConfig,
			deliveryFees: {
				FR: { amount: 8, currency: EUR, methods: [{ label: 'Express', amount: 20, currency: EUR }] }
			}
		} satisfies RuntimeConfig['deliveryFees'];

		it('uses the base Default tariff when no method is selected', () => {
			expect(computeDeliveryFees(EUR, 'FR', [shippingItem], withCountryMethods)).toBe(8);
		});

		it('uses the selected named method tariff', () => {
			expect(computeDeliveryFees(EUR, 'FR', [shippingItem], withCountryMethods, 'Express')).toBe(
				20
			);
		});

		it('matches the method label case-insensitively (trim + lowercase)', () => {
			expect(computeDeliveryFees(EUR, 'FR', [shippingItem], withCountryMethods, '  eXPRess ')).toBe(
				20
			);
		});

		it('falls back to the Default tariff when the selected method is unknown', () => {
			expect(
				computeDeliveryFees(EUR, 'FR', [shippingItem], withCountryMethods, 'Nonexistent')
			).toBe(8);
		});

		it('resolves methods from an enabled zone', () => {
			const config = {
				...baseConfig,
				deliveryZones: [
					{
						name: 'EU',
						countries: ['FR' as const],
						amount: 10,
						currency: EUR,
						enabled: true,
						methods: [{ label: 'Express', amount: 30, currency: EUR }]
					}
				]
			} satisfies RuntimeConfig['deliveryFees'];
			expect(computeDeliveryFees(EUR, 'FR', [shippingItem], config, 'Express')).toBe(30);
			expect(computeDeliveryFees(EUR, 'FR', [shippingItem], config)).toBe(10);
		});

		it('supports a zero-priced method', () => {
			const config = {
				...baseConfig,
				deliveryFees: {
					FR: { amount: 8, currency: EUR, methods: [{ label: 'Pickup', amount: 0, currency: EUR }] }
				}
			} satisfies RuntimeConfig['deliveryFees'];
			expect(computeDeliveryFees(EUR, 'FR', [shippingItem], config, 'Pickup')).toBe(0);
		});

		it('applies the selected method in perItem mode (product overrides the same label)', () => {
			const config = {
				...baseConfig,
				mode: 'perItem',
				deliveryFees: { FR: { amount: 8, currency: EUR } }
			} satisfies RuntimeConfig['deliveryFees'];
			const item = {
				product: {
					price: { amount: 10, currency: EUR },
					shipping: true,
					deliveryFees: {
						FR: {
							amount: 15,
							currency: EUR,
							methods: [{ label: 'Express', amount: 50, currency: EUR }]
						}
					}
				},
				quantity: 1
			};
			expect(computeDeliveryFees(EUR, 'FR', [item], config, 'Express')).toBe(50);
		});

		it('returns NaN for a blacklisted country', () => {
			const config = {
				...baseConfig,
				deliveryFees: { default: { amount: 8, currency: EUR } },
				defaultBlacklist: ['FR' as const]
			} satisfies RuntimeConfig['deliveryFees'];
			expect(computeDeliveryFees(EUR, 'FR', [shippingItem], config, 'Express')).toBeNaN();
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

describe('freeDeliveryThresholdInfo', () => {
	// mainCurrency = SAT (= UNDERLYING_CURRENCY) avoids exchange-rate setup: no conversion.
	const base = { enabled: true, mainCurrency: 'SAT' as const };

	it('is free when the cart strictly exceeds the threshold', () => {
		expect(freeDeliveryThresholdInfo({ ...base, cartTotalWithVat: 100, threshold: 50 })).toEqual({
			reached: true,
			remaining: 0
		});
	});

	it('keeps normal rules when the cart equals the threshold (strict >)', () => {
		expect(freeDeliveryThresholdInfo({ ...base, cartTotalWithVat: 50, threshold: 50 })).toEqual({
			reached: false,
			remaining: 0
		});
	});

	it('reports the remaining amount when below the threshold', () => {
		expect(freeDeliveryThresholdInfo({ ...base, cartTotalWithVat: 30, threshold: 50 })).toEqual({
			reached: false,
			remaining: 20
		});
	});

	it('is disabled when the feature flag is off', () => {
		expect(
			freeDeliveryThresholdInfo({ ...base, enabled: false, cartTotalWithVat: 100, threshold: 50 })
		).toEqual({ reached: false, remaining: 0 });
	});

	it('is disabled when the threshold is 0 / null / undefined', () => {
		expect(freeDeliveryThresholdInfo({ ...base, cartTotalWithVat: 100, threshold: 0 })).toEqual({
			reached: false,
			remaining: 0
		});
		expect(freeDeliveryThresholdInfo({ ...base, cartTotalWithVat: 100, threshold: null })).toEqual({
			reached: false,
			remaining: 0
		});
		expect(
			freeDeliveryThresholdInfo({ ...base, cartTotalWithVat: 100, threshold: undefined })
		).toEqual({ reached: false, remaining: 0 });
	});
});
