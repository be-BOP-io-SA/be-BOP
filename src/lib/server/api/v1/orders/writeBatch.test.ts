import { MongoClient, ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ordersModule from '$lib/server/orders';
import { env } from '$env/dynamic/private';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import {
	TEST_DIGITAL_PRODUCT,
	TEST_PHYSICAL_PRODUCT,
	TEST_PRODUCT_STOCK
} from '$lib/server/seed/product';
import type { AuthenticatedApiKey } from '$lib/types/ApiV1';
import { writeBatch } from './writeBatch';
import { writeOne } from './writeOne';
import { amountToMinor } from './money';
import { CATALOG_INTEGRITY_WARNING_LABEL_ID } from './ensureCatalogIntegrityLabel';

const apiKey: AuthenticatedApiKey = {
	_id: new ObjectId(),
	name: 'integration-key',
	scopes: ['orders:write'],
	keyPrefix: 'bebop_ak_test_intkey01'
};

function paidCommand(overrides: Record<string, unknown> = {}) {
	const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
	return {
		externalOrderId: 'pos-ext-1',
		currency: 'EUR' as const,
		items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
		payment: {
			method: 'point-of-sale' as const,
			status: 'paid' as const,
			amountMinor,
			currency: 'EUR' as const
		},
		...overrides
	};
}

function requireOrderId(result: { orderId?: string | null }): string {
	if (!result.orderId) {
		throw new Error('expected orderId on batch result');
	}
	return result.orderId;
}

const MONGO_UNAVAILABLE_MSG =
	'Mongo not available — start docker compose -f docker-compose.dev.yml up -d mongo';

/** Fast probe so the suite can skip instead of hanging on beforeEach/cleanDb. */
async function isMongoAvailable(): Promise<boolean> {
	const url = env.MONGODB_TEST_URL || 'mongodb://127.0.0.1:27017';
	const probe = new MongoClient(url, {
		directConnection: true,
		serverSelectionTimeoutMS: 2_000
	});
	try {
		await probe.connect();
		await probe.db('admin').command({ ping: 1 });
		return true;
	} catch {
		return false;
	} finally {
		await probe.close().catch(() => undefined);
	}
}

const mongoAvailable = await isMongoAvailable();
if (!mongoAvailable) {
	console.warn(MONGO_UNAVAILABLE_MSG);
}

describe.skipIf(!mongoAvailable)('writeBatch / writeOne (Mongo integration)', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne({ ...TEST_DIGITAL_PRODUCT });
		apiKey._id = new ObjectId();
		// Predictable totals for amountMinor assertions (default mainCurrency is BTC).
		runtimeConfig.mainCurrency = 'EUR';
		runtimeConfig.secondaryCurrency = 'USD';
		runtimeConfig.vatExempted = true;
	}, 60_000);

	it('does not settle a zero-base-price variation product as free', async () => {
		// Base price 0, the paid part lives entirely in the chosen variation. Summing the base
		// price alone would read this as a zero total, pick paymentMethod 'free', and mark the
		// order paid without any money moving.
		const variationProduct = {
			...TEST_DIGITAL_PRODUCT,
			_id: 'variation-zero-base',
			alias: ['variation-zero-base'],
			price: { amount: 0, currency: 'EUR' as const },
			payWhatYouWant: false,
			variations: [{ name: 'size', value: 'XL', price: 10 }]
		};
		await collections.products.insertOne(variationProduct);

		const res = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'variation-not-free-1',
					currency: 'EUR' as const,
					items: [
						{ productId: variationProduct._id, quantity: 1, chosenVariations: { size: 'XL' } }
					],
					payment: {
						method: 'point-of-sale' as const,
						status: 'paid' as const,
						amountMinor: amountToMinor(10, 'EUR'),
						currency: 'EUR' as const
					}
				}
			]
		});

		const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
		expect(order).toBeTruthy();
		expect(order?.payments[0].method).not.toBe('free');
		expect(order?.payments[0].method).toBe('point-of-sale');
		// The variation surcharge must reach the order total, not just the item line.
		expect(order?.currencySnapshot.main.totalPrice.amount).toBe(10);
		expect(order?.items[0].currencySnapshot.main.customPrice?.amount).toBe(10);
	});

	it('creates a paid order from lines and marks payment paid', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [paidCommand({ externalOrderId: 'create-paid-1' })]
		});
		expect(res.status).toBe('ok');
		expect(res.ok).toBe(true);
		expect(res.results).toHaveLength(1);
		expect(res.results[0]).toMatchObject({
			externalOrderId: 'create-paid-1',
			status: 'created'
		});
		expect(res.results[0].orderId).toBeTruthy();

		const order = await collections.orders.findOne({ _id: res.results[0].orderId });
		expect(order).toBeTruthy();
		expect(order?.status).toBe('paid');
		expect(order?.payments[0]?.status).toBe('paid');
		expect(order?.onLocation).toBe(true);
		expect(order?.shippingAddress).toBeUndefined();
		expect(order?.externalOrderId).toBe('create-paid-1');
		expect(order?.externalSourceApiKeyId?.toString()).toBe(apiKey._id.toString());
		expect(order?.user.sessionId).toBe(`api-v1:${apiKey._id.toString()}`);
		expect(order?.user.userHasPosOptions).toBe(true);
	});

	it('returns duplicate on replay without mutating the existing order', async () => {
		const first = await writeBatch({
			apiKey,
			orders: [paidCommand({ externalOrderId: 'dup-1' })]
		});
		expect(first.results[0].status).toBe('created');
		const orderId = requireOrderId(first.results[0]);

		const before = await collections.orders.findOne({ _id: orderId });
		const second = await writeBatch({
			apiKey,
			orders: [paidCommand({ externalOrderId: 'dup-1', notes: 'should-not-apply' })]
		});
		expect(second.status).toBe('ok');
		expect(second.results[0]).toMatchObject({
			status: 'duplicate',
			orderId
		});
		const after = await collections.orders.findOne({ _id: orderId });
		expect(after?.notes?.some((n) => n.content === 'should-not-apply')).toBeFalsy();
		expect(after?.updatedAt?.getTime()).toBe(before?.updatedAt?.getTime());
	});

	it('creates with PRODUCT_MISSING warning and catalog-integrity-warning label', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'missing-1',
					items: [
						{
							productId: 'ghost-sku',
							quantity: 1,
							customPrice: { amountMinor: 250, currency: 'EUR' }
						}
					],
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor: 250,
						currency: 'EUR'
					}
				})
			]
		});
		expect(res.status).toBe('ok_with_warnings');
		expect(res.results[0].status).toBe('created');
		expect(res.results[0].warnings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'PRODUCT_MISSING', productId: 'ghost-sku' })
			])
		);

		const order = await collections.orders.findOne({ _id: res.results[0].orderId });
		expect(order?.items[0]?.product.name).toBe('Missing product ghost-sku');
		expect(order?.items[0]?.product.shipping).toBe(false);
		expect(order?.orderLabelIds).toContain(CATALOG_INTEGRITY_WARNING_LABEL_ID);
		const label = await collections.labels.findOne({ _id: CATALOG_INTEGRITY_WARNING_LABEL_ID });
		expect(label).toBeTruthy();
	});

	it('fails the command when stock is insufficient', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'stock-fail-1',
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: TEST_PRODUCT_STOCK + 1 }],
					payment: {
						method: 'point-of-sale',
						status: 'pending',
						amountMinor: amountToMinor(
							TEST_DIGITAL_PRODUCT.price.amount * (TEST_PRODUCT_STOCK + 1),
							'EUR'
						),
						currency: 'EUR'
					}
				})
			]
		});
		expect(res.status).toBe('ok_with_errors');
		expect(res.ok).toBe(false);
		expect(res.results[0].status).toBe('failed');
		expect(res.results[0].error?.code).toBe('STOCK_UNAVAILABLE');
		expect(await collections.orders.countDocuments({})).toBe(0);
	});

	it('mixes created / failed / warning statuses in one batch', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({ externalOrderId: 'mix-ok' }),
				paidCommand({
					externalOrderId: 'mix-stock',
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: TEST_PRODUCT_STOCK + 5 }],
					payment: {
						method: 'point-of-sale',
						status: 'pending',
						amountMinor: 1,
						currency: 'EUR'
					}
				}),
				paidCommand({
					externalOrderId: 'mix-missing',
					items: [
						{ productId: 'absent', quantity: 1, customPrice: { amountMinor: 100, currency: 'EUR' } }
					],
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor: 100,
						currency: 'EUR'
					}
				})
			]
		});
		expect(res.status).toBe('ok_with_errors');
		expect(res.results.map((r) => r.status)).toEqual(['created', 'failed', 'created']);
		expect(res.results[2].warnings?.[0]?.code).toBe('PRODUCT_MISSING');
	});

	it('honors client createdAt and maps customFields + posLabel', async () => {
		await collections.posPaymentSubtypes.updateOne(
			{ slug: 'cash' },
			{
				$set: {
					name: 'Cash',
					sortOrder: 0,
					updatedAt: new Date(),
					disabled: false
				},
				$setOnInsert: { _id: new ObjectId(), createdAt: new Date() }
			},
			{ upsert: true }
		);
		const createdAt = '2024-06-01T12:00:00.000Z';
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'meta-1',
					createdAt,
					customFields: { table: 'A1' },
					payment: {
						method: 'point-of-sale',
						status: 'pending',
						amountMinor: amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR'),
						currency: 'EUR',
						posLabel: 'cash'
					}
				})
			]
		});
		expect(res.results[0].status).toBe('created');
		const order = await collections.orders.findOne({ _id: res.results[0].orderId });
		expect(order?.createdAt.toISOString()).toBe(createdAt);
		expect(order?.customCheckoutFields).toEqual([
			expect.objectContaining({ fieldId: 'api:table', slug: 'table', type: 'free', value: 'A1' })
		]);
		expect(order?.payments[0]?.posSubtype).toBe('cash');
		expect(order?.status).toBe('pending');
	});

	it('warns AMOUNT_MISMATCH and POS_LABEL_UNKNOWN without failing', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'warn-1',
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor: 1,
						currency: 'EUR',
						posLabel: 'does-not-exist'
					}
				})
			]
		});
		expect(res.status).toBe('ok_with_warnings');
		expect(res.results[0].status).toBe('created');
		const codes = res.results[0].warnings?.map((w) => w.code) ?? [];
		expect(codes).toEqual(expect.arrayContaining(['AMOUNT_MISMATCH', 'POS_LABEL_UNKNOWN']));
		const order = await collections.orders.findOne({ _id: res.results[0].orderId });
		expect(order?.status).toBe('paid');
		expect(order?.payments[0]?.posSubtype).toBeUndefined();
	});

	it('fails the command when order currency differs from mainCurrency', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [paidCommand({ externalOrderId: 'cur-1', currency: 'USD' })]
		});
		expect(res.status).toBe('ok_with_errors');
		expect(res.results[0]).toMatchObject({
			status: 'failed',
			error: { code: 'CURRENCY_UNSUPPORTED' }
		});
		expect(await collections.orders.countDocuments({})).toBe(0);
	});

	it('on duplicate replay with paid, completes a still-pending order payment', async () => {
		const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const first = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'dup-pay-1',
					payment: {
						method: 'point-of-sale',
						status: 'pending',
						amountMinor,
						currency: 'EUR'
					}
				})
			]
		});
		expect(first.results[0].status).toBe('created');
		const orderId = requireOrderId(first.results[0]);
		const pending = await collections.orders.findOne({ _id: orderId });
		expect(pending?.status).toBe('pending');
		expect(pending?.payments[0]?.status).toBe('pending');

		const second = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'dup-pay-1',
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor,
						currency: 'EUR'
					}
				})
			]
		});
		expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
		const paid = await collections.orders.findOne({ _id: orderId });
		expect(paid?.status).toBe('paid');
		expect(paid?.payments[0]?.status).toBe('paid');
	});

	it('applies canceled payment via domain path (not raw status set)', async () => {
		const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'cancel-1',
					payment: {
						method: 'point-of-sale',
						status: 'canceled',
						amountMinor,
						currency: 'EUR'
					}
				})
			]
		});
		expect(res.results[0].status).toBe('created');
		const order = await collections.orders.findOne({ _id: res.results[0].orderId });
		expect(order?.payments[0]?.status).toBe('canceled');
		// All payments canceled while order was pending → order becomes canceled via onOrderPaymentFailed
		expect(order?.status).toBe('canceled');
	});

	describe('C4 admin-parity payment transitions on duplicate', () => {
		function pendingCreate(externalOrderId: string) {
			const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
			return paidCommand({
				externalOrderId,
				payment: {
					method: 'point-of-sale',
					status: 'pending',
					amountMinor,
					currency: 'EUR'
				}
			});
		}

		it('pending→paid settles via onOrderPayment (admin confirm parity)', async () => {
			const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
			const first = await writeBatch({
				apiKey,
				orders: [pendingCreate('c4-paid')]
			});
			expect(first.results[0].status).toBe('created');
			const orderId = requireOrderId(first.results[0]);
			const second = await writeBatch({
				apiKey,
				orders: [
					paidCommand({
						externalOrderId: 'c4-paid',
						payment: {
							method: 'point-of-sale',
							status: 'paid',
							amountMinor,
							currency: 'EUR'
						}
					})
				]
			});
			expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
			const order = await collections.orders.findOne({ _id: orderId });
			expect(order?.payments[0]?.status).toBe('paid');
			expect(order?.status).toBe('paid');
		});

		it.each(['canceled', 'failed', 'expired'] as const)(
			'pending→%s via onOrderPaymentFailed (admin cancel / lock parity)',
			async (status) => {
				const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
				const ext = `c4-${status}`;
				const first = await writeBatch({ apiKey, orders: [pendingCreate(ext)] });
				const orderId = requireOrderId(first.results[0]);
				const second = await writeBatch({
					apiKey,
					orders: [
						paidCommand({
							externalOrderId: ext,
							payment: {
								method: 'point-of-sale',
								status,
								amountMinor,
								currency: 'EUR'
							}
						})
					]
				});
				expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
				const order = await collections.orders.findOne({ _id: orderId });
				expect(order?.payments[0]?.status).toBe(status);
			}
		);

		it('already-paid replay is a no-op (admin would 400 non-pending)', async () => {
			const first = await writeBatch({
				apiKey,
				orders: [paidCommand({ externalOrderId: 'c4-replay-paid' })]
			});
			const orderId = requireOrderId(first.results[0]);
			const before = await collections.orders.findOne({ _id: orderId });
			const second = await writeBatch({
				apiKey,
				orders: [paidCommand({ externalOrderId: 'c4-replay-paid', notes: 'ignored' })]
			});
			expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
			const after = await collections.orders.findOne({ _id: orderId });
			expect(after?.payments[0]?.status).toBe('paid');
			expect(after?.updatedAt?.getTime()).toBe(before?.updatedAt?.getTime());
			expect(after?.notes?.some((n) => n.content === 'ignored')).toBeFalsy();
		});

		it('already-terminal payment ignores further paid/canceled intents', async () => {
			const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
			const first = await writeBatch({ apiKey, orders: [pendingCreate('c4-terminal')] });
			const orderId = requireOrderId(first.results[0]);
			await writeBatch({
				apiKey,
				orders: [
					paidCommand({
						externalOrderId: 'c4-terminal',
						payment: {
							method: 'point-of-sale',
							status: 'canceled',
							amountMinor,
							currency: 'EUR'
						}
					})
				]
			});
			const mid = await collections.orders.findOne({ _id: orderId });
			expect(mid?.payments[0]?.status).toBe('canceled');
			const third = await writeBatch({
				apiKey,
				orders: [
					paidCommand({
						externalOrderId: 'c4-terminal',
						payment: {
							method: 'point-of-sale',
							status: 'paid',
							amountMinor,
							currency: 'EUR'
						}
					})
				]
			});
			expect(third.results[0].status).toBe('duplicate');
			const after = await collections.orders.findOne({ _id: orderId });
			expect(after?.payments[0]?.status).toBe('canceled');
			expect(after?.status).not.toBe('paid');
		});

		it('client pending on duplicate is a no-op', async () => {
			const first = await writeBatch({ apiKey, orders: [pendingCreate('c4-pending-noop')] });
			const orderId = requireOrderId(first.results[0]);
			const second = await writeBatch({
				apiKey,
				orders: [pendingCreate('c4-pending-noop')]
			});
			expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
			const order = await collections.orders.findOne({ _id: orderId });
			expect(order?.payments[0]?.status).toBe('pending');
			expect(order?.status).toBe('pending');
		});
	});

	it('P2: same externalOrderId twice in one batch → created then duplicate', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({ externalOrderId: 'batch-dup' }),
				paidCommand({ externalOrderId: 'batch-dup' })
			]
		});
		expect(res.results).toHaveLength(2);
		expect(res.results[0].status).toBe('created');
		expect(res.results[1].status).toBe('duplicate');
		expect(res.results[1].orderId).toBe(res.results[0].orderId);
		expect(await collections.orders.countDocuments({})).toBe(1);
	});

	it('P0: concurrent inserts with same external id converge to one order', async () => {
		const cmd = paidCommand({ externalOrderId: 'race-ext-1' });
		const [a, b] = await Promise.all([
			writeOne({ apiKey, order: cmd }),
			writeOne({ apiKey, order: cmd })
		]);
		const statuses = [a.status, b.status].sort();
		expect(statuses).toEqual(['created', 'duplicate']);
		expect(a.orderId).toBeTruthy();
		expect(b.orderId).toBeTruthy();
		expect(a.orderId).toBe(b.orderId);
		expect(await collections.orders.countDocuments({ externalOrderId: 'race-ext-1' })).toBe(1);
	});

	it('Face A onLocation accepts shippable SKU without shippingAddress', async () => {
		await collections.products.insertOne({ ...TEST_PHYSICAL_PRODUCT });
		const amountMinor = amountToMinor(TEST_PHYSICAL_PRODUCT.price.amount, 'EUR');
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'pos-physical-onlocation-1',
					items: [{ productId: TEST_PHYSICAL_PRODUCT._id, quantity: 1 }],
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor,
						currency: 'EUR'
					}
				})
			]
		});
		expect(res.status).toBe('ok');
		expect(res.results[0].status).toBe('created');
		expect(res.results[0].error?.message ?? '').not.toMatch(/Shipping address is required/i);
		const order = await collections.orders.findOne({ _id: res.results[0].orderId });
		expect(order).toBeTruthy();
		expect(order?.onLocation).toBe(true);
		expect(order?.shippingAddress).toBeUndefined();
		expect(order?.items[0]?.product.shipping).toBe(true);
	});

	it('sells at the counter with mandatory billing on, as /pos/touch does', async () => {
		// The rule targets the checkout form. A till has none, and the API is a till.
		const prev = runtimeConfig.isBillingAddressMandatory;
		runtimeConfig.isBillingAddressMandatory = true;
		try {
			const res = await writeBatch({
				apiKey,
				orders: [paidCommand({ externalOrderId: 'billing-gate-1' })]
			});
			expect(res.results[0].status).toBe('created');
			expect(await collections.orders.countDocuments({})).toBe(1);
		} finally {
			runtimeConfig.isBillingAddressMandatory = prev;
		}
	});

	it('zero-total paid uses free domain path (onOrderPayment), not raw status set', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'zero-paid-1',
					items: [
						{
							productId: TEST_DIGITAL_PRODUCT._id,
							quantity: 1,
							customPrice: { amountMinor: 0, currency: 'EUR' }
						}
					],
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor: 0,
						currency: 'EUR'
					}
				})
			]
		});
		expect(res.results[0].status).toBe('created');
		const order = await collections.orders.findOne({ _id: res.results[0].orderId });
		expect(order?.status).toBe('paid');
		expect(order?.payments.length).toBeGreaterThanOrEqual(1);
		expect(order?.payments[0]?.method).toBe('free');
		expect(order?.payments[0]?.status).toBe('paid');
		expect(order?.payments[0]?.invoice).toBeTruthy();
	});

	it('zero-total pending→paid on duplicate uses addOrderPayment(free)/onOrderPayment', async () => {
		const first = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'zero-settle-1',
					items: [
						{
							productId: TEST_DIGITAL_PRODUCT._id,
							quantity: 1,
							customPrice: { amountMinor: 0, currency: 'EUR' }
						}
					],
					payment: {
						method: 'point-of-sale',
						status: 'pending',
						amountMinor: 0,
						currency: 'EUR'
					}
				})
			]
		});
		expect(first.results[0].status).toBe('created');
		const orderId = requireOrderId(first.results[0]);
		const pending = await collections.orders.findOne({ _id: orderId });
		expect(pending?.status).toBe('pending');
		expect(pending?.payments ?? []).toHaveLength(0);

		const second = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'zero-settle-1',
					items: [
						{
							productId: TEST_DIGITAL_PRODUCT._id,
							quantity: 1,
							customPrice: { amountMinor: 0, currency: 'EUR' }
						}
					],
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor: 0,
						currency: 'EUR'
					}
				})
			]
		});
		expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
		const paid = await collections.orders.findOne({ _id: orderId });
		expect(paid?.status).toBe('paid');
		expect(paid?.payments[0]?.method).toBe('free');
		expect(paid?.payments[0]?.status).toBe('paid');
		expect(paid?.payments[0]?.invoice).toBeTruthy();
	});

	it('creates an order with two payments and settles/cancels by index on duplicate', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 2);
		const bMinor = totalMinor - aMinor;
		const first = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-pay-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const
						},
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: bMinor,
							currency: 'EUR' as const
						}
					]
				}
			]
		});
		expect(first.results[0].status).toBe('created');
		const orderId = requireOrderId(first.results[0]);
		const created = await collections.orders.findOne({ _id: orderId });
		expect(created?.payments).toHaveLength(2);
		expect(created?.payments.every((p) => p.status === 'pending')).toBe(true);
		expect(created?.status).toBe('pending');

		const second = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-pay-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'paid' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const
						},
						{
							method: 'point-of-sale' as const,
							status: 'canceled' as const,
							amountMinor: bMinor,
							currency: 'EUR' as const
						}
					]
				}
			]
		});
		expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
		const after = await collections.orders.findOne({ _id: orderId });
		expect(after?.payments[0]?.status).toBe('paid');
		expect(after?.payments[1]?.status).toBe('canceled');
		// Not fully paid (second canceled) — order must not flip to paid.
		expect(after?.status).not.toBe('paid');
	});

	it('mono singular payment still works alongside payments[] support', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [paidCommand({ externalOrderId: 'mono-still-1' })]
		});
		expect(res.results[0].status).toBe('created');
		const order = await collections.orders.findOne({ _id: res.results[0].orderId });
		expect(order?.payments).toHaveLength(1);
		expect(order?.payments[0]?.status).toBe('paid');
		expect(order?.status).toBe('paid');
	});

	it('persists externalPaymentId and settles correctly when payments are reordered on retry', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 2);
		const bMinor = totalMinor - aMinor;
		const first = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-reorder-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'pay-a'
						},
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: bMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'pay-b'
						}
					]
				}
			]
		});
		expect(first.results[0].status).toBe('created');
		const orderId = requireOrderId(first.results[0]);
		const created = await collections.orders.findOne({ _id: orderId });
		expect(created?.payments.map((p) => p.externalPaymentId)).toEqual(['pay-a', 'pay-b']);

		// Swap order + opposite statuses — must settle by externalPaymentId, not index.
		const second = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-reorder-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'canceled' as const,
							amountMinor: bMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'pay-b'
						},
						{
							method: 'point-of-sale' as const,
							status: 'paid' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'pay-a'
						}
					]
				}
			]
		});
		expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
		const after = await collections.orders.findOne({ _id: orderId });
		const byId = Object.fromEntries(
			(after?.payments ?? []).map((p) => [p.externalPaymentId, p.status])
		);
		expect(byId['pay-a']).toBe('paid');
		expect(byId['pay-b']).toBe('canceled');
	});

	it('matches swapped payments by amount+method when externalPaymentId is absent', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 3);
		const bMinor = totalMinor - aMinor;
		expect(aMinor).not.toBe(bMinor);
		const first = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-swap-amt-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const
						},
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: bMinor,
							currency: 'EUR' as const
						}
					]
				}
			]
		});
		const orderId = requireOrderId(first.results[0]);
		const second = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-swap-amt-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'paid' as const,
							amountMinor: bMinor,
							currency: 'EUR' as const
						},
						{
							method: 'point-of-sale' as const,
							status: 'canceled' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const
						}
					]
				}
			]
		});
		expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
		const after = await collections.orders.findOne({ _id: orderId });
		expect(after?.payments[0]?.status).toBe('canceled'); // aMinor row
		expect(after?.payments[1]?.status).toBe('paid'); // bMinor row
	});

	it('does not double-apply two payload payments onto one order payment', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 3);
		const bMinor = totalMinor - aMinor;
		expect(aMinor).not.toBe(bMinor);
		const first = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-nodouble-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'only-a'
						},
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: bMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'only-b'
						}
					]
				}
			]
		});
		const orderId = requireOrderId(first.results[0]);
		// Both payload rows claim only-a — second must not mutate only-a again, nor steal only-b by amount.
		const second = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-nodouble-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'paid' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'only-a'
						},
						{
							method: 'point-of-sale' as const,
							status: 'canceled' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'only-a'
						}
					]
				}
			]
		});
		expect(second.results[0].status).toBe('duplicate');
		const after = await collections.orders.findOne({ _id: orderId });
		expect(after?.payments[0]?.status).toBe('paid');
		expect(after?.payments[1]?.status).toBe('pending');
	});

	it('domain error during settle stays duplicate with PAYMENT_SYNC_FAILED (no batch throw)', async () => {
		const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const first = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'settle-err-1',
					payment: {
						method: 'point-of-sale',
						status: 'pending',
						amountMinor,
						currency: 'EUR',
						externalPaymentId: 'pay-settle-1'
					}
				}),
				// Create sibling before spy so paid create is not affected.
				paidCommand({ externalOrderId: 'settle-ok-sibling' })
			]
		});
		expect(first.results[0].status).toBe('created');
		expect(first.results[1].status).toBe('created');
		const orderId = requireOrderId(first.results[0]);

		// Http-like domain error (same shape as SvelteKit HttpError / mapDomainError).
		const domainErr = { status: 400, body: 'Payment is not pending' };
		const paySpy = vi.spyOn(ordersModule, 'onOrderPayment').mockRejectedValue(domainErr);
		const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		try {
			const second = await writeBatch({
				apiKey,
				orders: [
					// Already-paid sibling: duplicate no-op (does not call onOrderPayment).
					paidCommand({ externalOrderId: 'settle-ok-sibling' }),
					paidCommand({
						externalOrderId: 'settle-err-1',
						payment: {
							method: 'point-of-sale',
							status: 'paid',
							amountMinor,
							currency: 'EUR',
							externalPaymentId: 'pay-settle-1'
						}
					})
				]
			});
			// Sibling still processed; settle error does not 500 the batch.
			expect(second.results[0]).toMatchObject({ status: 'duplicate' });
			expect(second.results[1]).toMatchObject({
				status: 'duplicate',
				orderId
			});
			expect(second.results[1].warnings).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						code: 'PAYMENT_SYNC_FAILED',
						details: expect.objectContaining({ domainCode: 'DOMAIN_ERROR' })
					})
				])
			);
			expect(second.status).toBe('ok_with_warnings');
			expect(logSpy).toHaveBeenCalledWith(
				'[api/v1] payment sync on duplicate failed',
				expect.objectContaining({
					orderId,
					externalOrderId: 'settle-err-1',
					code: 'DOMAIN_ERROR'
				})
			);
		} finally {
			paySpy.mockRestore();
			logSpy.mockRestore();
		}
	});

	it('logs when addOrderPayment on duplicate is rejected by domain guards', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 2);
		// Under-cover multi so remaining > 0 and shouldAddUnmatchedPayment can run.
		const first = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'add-log-1',
					currency: 'EUR' as const,
					items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
					payments: [
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: aMinor,
							currency: 'EUR' as const,
							externalPaymentId: 'pay-a'
						},
						{
							method: 'point-of-sale' as const,
							status: 'pending' as const,
							amountMinor: 1,
							currency: 'EUR' as const,
							externalPaymentId: 'pay-tiny'
						}
					]
				}
			]
		});
		expect(first.results[0].status).toBe('created');
		const orderId = requireOrderId(first.results[0]);

		const domainErr = { status: 400, body: 'Order already fully paid' };
		const addSpy = vi.spyOn(ordersModule, 'addOrderPayment').mockRejectedValue(domainErr);
		const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		try {
			const second = await writeBatch({
				apiKey,
				orders: [
					{
						externalOrderId: 'add-log-1',
						currency: 'EUR' as const,
						items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
						payments: [
							{
								method: 'point-of-sale' as const,
								status: 'pending' as const,
								amountMinor: aMinor,
								currency: 'EUR' as const,
								externalPaymentId: 'pay-a'
							},
							{
								method: 'point-of-sale' as const,
								status: 'pending' as const,
								amountMinor: 1,
								currency: 'EUR' as const,
								externalPaymentId: 'pay-tiny'
							},
							{
								method: 'point-of-sale' as const,
								status: 'pending' as const,
								amountMinor: totalMinor - aMinor - 1,
								currency: 'EUR' as const,
								externalPaymentId: 'pay-new-extra'
							}
						]
					}
				]
			});
			expect(second.results[0]).toMatchObject({ status: 'duplicate', orderId });
			expect(logSpy).toHaveBeenCalledWith(
				'[api/v1] addOrderPayment on duplicate failed',
				expect.objectContaining({
					orderId,
					externalPaymentId: 'pay-new-extra',
					code: 'DOMAIN_ERROR',
					message: 'Order already fully paid'
				})
			);
		} finally {
			addSpy.mockRestore();
			logSpy.mockRestore();
		}
	});

	it('uses channel api and does not apply auto-discounts on Face A create', async () => {
		const now = new Date();
		await collections.discounts.insertOne({
			_id: 'api-skip-auto-disc',
			name: 'API/Web-POS 50%',
			mode: 'percentage',
			percentage: 50,
			wholeCatalog: true,
			productIds: [],
			// Even if a shop discount targets api (or legacy web-pos), Face A must not rewrite totals.
			channels: ['api', 'web-pos'],
			beginsAt: new Date(now.getTime() - 60_000),
			endsAt: null,
			createdAt: now,
			updatedAt: now
		});
		const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const createSpy = vi.spyOn(ordersModule, 'createOrder');
		try {
			const res = await writeBatch({
				apiKey,
				orders: [
					paidCommand({
						externalOrderId: 'no-auto-disc-1',
						payment: {
							method: 'point-of-sale',
							status: 'paid',
							amountMinor,
							currency: 'EUR'
						}
					})
				]
			});
			expect(res.results[0].status).toBe('created');
			expect(createSpy).toHaveBeenCalledWith(
				expect.any(Array),
				expect.anything(),
				expect.objectContaining({ channel: 'api', skipAutoDiscounts: true })
			);
			const order = await collections.orders.findOne({ _id: res.results[0].orderId });
			expect(order).toBeTruthy();
			if (!order) {
				throw new Error('expected order');
			}
			// Catalog line total must remain undiscounted (50% discount must not apply).
			expect(order.currencySnapshot.main.totalPrice.amount).toBe(TEST_DIGITAL_PRODUCT.price.amount);
			expect(order.items.every((item) => !item.discountPercentage)).toBe(true);
			const codes = res.results[0].warnings?.map((w) => w.code) ?? [];
			expect(codes).not.toContain('AMOUNT_MISMATCH');
		} finally {
			createSpy.mockRestore();
		}
	});

	it('domain error during create settle stays created with PAYMENT_SYNC_FAILED', async () => {
		const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		// Sibling created before spy so only the failing command exercises the create-path catch.
		const sibling = await writeBatch({
			apiKey,
			orders: [paidCommand({ externalOrderId: 'create-settle-ok-sibling' })]
		});
		expect(sibling.results[0].status).toBe('created');

		const paySpy = vi.spyOn(ordersModule, 'onOrderPayment').mockRejectedValue({
			status: 400,
			body: 'Payment settle boom'
		});
		const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		try {
			const res = await writeBatch({
				apiKey,
				orders: [
					paidCommand({
						externalOrderId: 'create-settle-err-1',
						payment: {
							method: 'point-of-sale',
							status: 'paid',
							amountMinor,
							currency: 'EUR',
							externalPaymentId: 'pay-create-1'
						}
					}),
					// Already-paid sibling: duplicate no-op (does not call onOrderPayment).
					paidCommand({ externalOrderId: 'create-settle-ok-sibling' })
				]
			});
			expect(res.results[0]).toMatchObject({
				status: 'created',
				orderId: expect.any(String)
			});
			expect(res.results[0].warnings).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						code: 'PAYMENT_SYNC_FAILED',
						details: expect.objectContaining({ domainCode: 'DOMAIN_ERROR' })
					})
				])
			);
			expect(res.results[1]).toMatchObject({ status: 'duplicate' });
			expect(res.status).toBe('ok_with_warnings');
			expect(logSpy).toHaveBeenCalledWith(
				'[api/v1] payment sync on create failed',
				expect.objectContaining({
					externalOrderId: 'create-settle-err-1',
					code: 'DOMAIN_ERROR'
				})
			);
		} finally {
			paySpy.mockRestore();
			logSpy.mockRestore();
		}

		// Idempotency key persisted — retry becomes duplicate, not a second create.
		const createdId = (
			await collections.orders.findOne({
				externalSourceApiKeyId: apiKey._id,
				externalOrderId: 'create-settle-err-1'
			})
		)?._id;
		expect(createdId).toBeTruthy();
		const retry = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'create-settle-err-1',
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor,
						currency: 'EUR',
						externalPaymentId: 'pay-create-1'
					}
				})
			]
		});
		expect(retry.results[0].status).toBe('duplicate');
		expect(retry.results[0].orderId).toBe(createdId);
	});
});
