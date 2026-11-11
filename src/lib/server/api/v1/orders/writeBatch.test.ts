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
import { API_ORDER_SELLER_ALIAS } from './seller';
import { amountToMinor } from './money';
import {
	API_ORDER_LABEL_ID,
	CATALOG_INTEGRITY_WARNING_LABEL_ID
} from './ensureCatalogIntegrityLabel';

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
		// The admin order listing reads the seller here, and labels a missing one "System".
		expect(order?.user.userAlias).toBe(API_ORDER_SELLER_ALIAS);
	});

	it('puts the labels the payload asked for on the order', async () => {
		await collections.labels.insertOne({
			_id: 'cashless',
			name: 'Cashless',
			color: '#000000',
			icon: '',
			createdAt: new Date(),
			updatedAt: new Date()
		});
		const res = await writeBatch({
			apiKey,
			orders: [paidCommand({ externalOrderId: 'label-1', labels: ['cashless'] })]
		});
		expect(res.status).toBe('ok');

		const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
		expect(order?.orderLabelIds).toEqual([API_ORDER_LABEL_ID, 'cashless']);
	});

	it('writes the order without an unknown label, and says so', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [paidCommand({ externalOrderId: 'label-2', labels: ['nope'] })]
		});
		expect(res.results[0].status).toBe('created');
		expect(res.results[0].warnings).toContainEqual(
			expect.objectContaining({ code: 'LABEL_MISSING', details: { labelId: 'nope' } })
		);

		const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
		// The label the caller asked for is gone; the one marking the sale as ours stays.
		expect(order?.orderLabelIds).toEqual([API_ORDER_LABEL_ID]);
	});

	it('refuses a replay without mutating the existing order', async () => {
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
		expect(second.status).toBe('ok_with_errors');
		expect(second.ok).toBe(false);
		expect(second.results[0]).toMatchObject({
			externalOrderId: 'dup-1',
			status: 'failed',
			error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID', details: { orderId } }
		});
		expect(second.results[0].orderId).toBeUndefined();
		const after = await collections.orders.findOne({ _id: orderId });
		expect(after?.notes?.some((n) => n.content === 'should-not-apply')).toBeFalsy();
		expect(after?.updatedAt?.getTime()).toBe(before?.updatedAt?.getTime());
		expect(await collections.orders.countDocuments({})).toBe(1);
	});

	it('creates a second order with the same external id when the key accepts it', async () => {
		const acceptingKey = { ...apiKey, acceptDuplicateExternalOrderIds: true };
		const first = await writeBatch({
			apiKey: acceptingKey,
			orders: [paidCommand({ externalOrderId: 'dup-accepted-1' })]
		});
		const second = await writeBatch({
			apiKey: acceptingKey,
			orders: [paidCommand({ externalOrderId: 'dup-accepted-1', notes: 'second sale' })]
		});
		expect(first.results[0].status).toBe('created');
		expect(second.results[0].status).toBe('created');
		const firstId = requireOrderId(first.results[0]);
		const secondId = requireOrderId(second.results[0]);
		expect(secondId).not.toBe(firstId);

		const orders = await collections.orders
			.find({ externalSourceApiKeyId: apiKey._id, externalOrderId: 'dup-accepted-1' })
			.toArray();
		expect(orders.map((order) => order._id).sort()).toEqual([firstId, secondId].sort());
		expect(orders.every((order) => order.status === 'paid')).toBe(true);
		// The first order is left as it was: the note went to the new one only.
		const firstOrder = orders.find((order) => order._id === firstId);
		expect(firstOrder?.notes?.some((n) => n.content === 'second sale')).toBeFalsy();
	});

	it('writes an order nobody is notified about when notifications is false', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({ externalOrderId: 'silent-1', notifications: false }),
				paidCommand({ externalOrderId: 'default-1' }),
				paidCommand({ externalOrderId: 'notified-1', notifications: true })
			]
		});
		expect(res.results.map((r) => r.status)).toEqual(['created', 'created', 'created']);
		const [silent, byDefault, notified] = await Promise.all(
			res.results.map((r) => collections.orders.findOne({ _id: requireOrderId(r) }))
		);
		expect(silent?.skipNotifications).toBe(true);
		// The order itself is written and paid as any other: only its notifications are off.
		expect(silent?.status).toBe('paid');
		expect(byDefault?.skipNotifications).toBeUndefined();
		expect(notified?.skipNotifications).toBeUndefined();
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

	it('does not complete a pending order from a replay marked paid', async () => {
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
		expect(second.results[0]).toMatchObject({
			status: 'failed',
			error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID', details: { orderId } }
		});
		const order = await collections.orders.findOne({ _id: orderId });
		expect(order?.status).toBe('pending');
		expect(order?.payments).toHaveLength(1);
		expect(order?.payments[0]?.status).toBe('pending');
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

	describe('C4 admin-parity payment transitions', () => {
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
			const paySpy = vi.spyOn(ordersModule, 'onOrderPayment');
			try {
				const res = await writeBatch({
					apiKey,
					orders: [paidCommand({ externalOrderId: 'c4-paid' })]
				});
				expect(res.results[0].status).toBe('created');
				expect(paySpy).toHaveBeenCalled();
				const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
				expect(order?.payments[0]?.status).toBe('paid');
				expect(order?.status).toBe('paid');
			} finally {
				paySpy.mockRestore();
			}
		});

		it.each(['canceled', 'failed', 'expired'] as const)(
			'pending→%s via onOrderPaymentFailed (admin cancel / lock parity)',
			async (status) => {
				const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
				const failedSpy = vi.spyOn(ordersModule, 'onOrderPaymentFailed');
				try {
					// One call: the order is created with its payment pending, then the outcome the till
					// reported is applied to it.
					const res = await writeBatch({
						apiKey,
						orders: [
							paidCommand({
								externalOrderId: `c4-${status}`,
								payment: {
									method: 'point-of-sale',
									status,
									amountMinor,
									currency: 'EUR'
								}
							})
						]
					});
					expect(res.results[0].status).toBe('created');
					expect(failedSpy).toHaveBeenCalledWith(expect.anything(), expect.anything(), status, {
						terminal: true
					});
					const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
					expect(order?.payments).toHaveLength(1);
					expect(order?.payments[0]?.status).toBe(status);
					// Its only payment is closed, so the order is closed with it rather than left waiting
					// for a payment that will never come.
					expect(order?.status).toBe(status);
				} finally {
					failedSpy.mockRestore();
				}
			}
		);

		it('keeps a paid deposit, and the order pending, when the other payment fails', async () => {
			const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
			const depositMinor = Math.floor(totalMinor / 2);
			const res = await writeBatch({
				apiKey,
				orders: [
					{
						externalOrderId: 'c4-deposit-then-failed',
						currency: 'EUR' as const,
						items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
						payments: [
							{
								method: 'point-of-sale' as const,
								status: 'paid' as const,
								amountMinor: depositMinor,
								currency: 'EUR' as const
							},
							{
								method: 'point-of-sale' as const,
								status: 'failed' as const,
								amountMinor: totalMinor - depositMinor,
								currency: 'EUR' as const
							}
						]
					}
				]
			});
			expect(res.results[0].status).toBe('created');
			const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
			expect(order?.payments.map((p) => p.status)).toEqual(['paid', 'failed']);
			// A payment was received: the order is neither closed as failed nor counted as paid.
			expect(order?.status).toBe('pending');
		});

		it('refuses a replay of a paid order and leaves it as it is', async () => {
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
			expect(second.results[0]).toMatchObject({
				status: 'failed',
				error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID', details: { orderId } }
			});
			const after = await collections.orders.findOne({ _id: orderId });
			expect(after?.payments[0]?.status).toBe('paid');
			expect(after?.updatedAt?.getTime()).toBe(before?.updatedAt?.getTime());
			expect(after?.notes?.some((n) => n.content === 'ignored')).toBeFalsy();
		});

		it('a failed order never turns paid on a later call', async () => {
			const amountMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
			const failedCommand = paidCommand({
				externalOrderId: 'c4-terminal',
				payment: {
					method: 'point-of-sale',
					status: 'failed',
					amountMinor,
					currency: 'EUR'
				}
			});
			const first = await writeBatch({ apiKey, orders: [failedCommand] });
			const orderId = requireOrderId(first.results[0]);
			const failed = await collections.orders.findOne({ _id: orderId });
			expect(failed?.status).toBe('failed');

			const paidRetry = paidCommand({ externalOrderId: 'c4-terminal' });
			const refused = await writeBatch({ apiKey, orders: [paidRetry] });
			expect(refused.results[0]).toMatchObject({
				status: 'failed',
				error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID' }
			});

			// Accepted as a new order, the paid retry is paid on its own; the failed one stays failed.
			const accepted = await writeBatch({
				apiKey: { ...apiKey, acceptDuplicateExternalOrderIds: true },
				orders: [paidRetry]
			});
			const retryId = requireOrderId(accepted.results[0]);
			expect(retryId).not.toBe(orderId);
			expect((await collections.orders.findOne({ _id: retryId }))?.status).toBe('paid');

			const after = await collections.orders.findOne({ _id: orderId });
			expect(after?.payments[0]?.status).toBe('failed');
			expect(after?.status).toBe('failed');
		});

		it('refuses a pending replay, leaving the pending order as it is', async () => {
			const first = await writeBatch({ apiKey, orders: [pendingCreate('c4-pending-noop')] });
			const orderId = requireOrderId(first.results[0]);
			const second = await writeBatch({
				apiKey,
				orders: [pendingCreate('c4-pending-noop')]
			});
			expect(second.results[0]).toMatchObject({
				status: 'failed',
				error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID', details: { orderId } }
			});
			const order = await collections.orders.findOne({ _id: orderId });
			expect(order?.payments[0]?.status).toBe('pending');
			expect(order?.status).toBe('pending');
		});
	});

	it('P2: same externalOrderId twice in one batch → created then refused', async () => {
		const res = await writeBatch({
			apiKey,
			orders: [
				paidCommand({ externalOrderId: 'batch-dup' }),
				paidCommand({ externalOrderId: 'batch-dup' })
			]
		});
		expect(res.results).toHaveLength(2);
		expect(res.results[0].status).toBe('created');
		expect(res.results[1]).toMatchObject({
			status: 'failed',
			error: {
				code: 'DUPLICATE_EXTERNAL_ORDER_ID',
				details: { orderId: res.results[0].orderId }
			}
		});
		expect(res.status).toBe('ok_with_errors');
		expect(await collections.orders.countDocuments({})).toBe(1);
	});

	it('P2: same externalOrderId twice in one batch → two orders when the key accepts it', async () => {
		const res = await writeBatch({
			apiKey: { ...apiKey, acceptDuplicateExternalOrderIds: true },
			orders: [
				paidCommand({ externalOrderId: 'batch-dup-accepted' }),
				paidCommand({ externalOrderId: 'batch-dup-accepted' })
			]
		});
		expect(res.results.map((r) => r.status)).toEqual(['created', 'created']);
		expect(res.results[1].orderId).not.toBe(res.results[0].orderId);
		expect(await collections.orders.countDocuments({ externalOrderId: 'batch-dup-accepted' })).toBe(
			2
		);
	});

	it('P0: concurrent inserts with same external id create one order, the other is refused', async () => {
		const cmd = paidCommand({ externalOrderId: 'race-ext-1' });
		const [a, b] = await Promise.all([
			writeOne({ apiKey, order: cmd }),
			writeOne({ apiKey, order: cmd })
		]);
		const statuses = [a.status, b.status].sort();
		expect(statuses).toEqual(['created', 'failed']);
		const refused = a.status === 'failed' ? a : b;
		expect(refused.error?.code).toBe('DUPLICATE_EXTERNAL_ORDER_ID');
		expect(refused.orderId).toBeUndefined();
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

	it('zero-total pending order is not settled by a replay marked paid', async () => {
		const zeroLine = [
			{
				productId: TEST_DIGITAL_PRODUCT._id,
				quantity: 1,
				customPrice: { amountMinor: 0, currency: 'EUR' as const }
			}
		];
		const first = await writeBatch({
			apiKey,
			orders: [
				paidCommand({
					externalOrderId: 'zero-settle-1',
					items: zeroLine,
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
					items: zeroLine,
					payment: {
						method: 'point-of-sale',
						status: 'paid',
						amountMinor: 0,
						currency: 'EUR'
					}
				})
			]
		});
		expect(second.results[0]).toMatchObject({
			status: 'failed',
			error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID', details: { orderId } }
		});
		const after = await collections.orders.findOne({ _id: orderId });
		expect(after?.status).toBe('pending');
		expect(after?.payments ?? []).toHaveLength(0);
	});

	it('creates an order with two payments and applies each status to its own row', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 2);
		const bMinor = totalMinor - aMinor;
		const res = await writeBatch({
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
		expect(res.results[0].status).toBe('created');
		const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
		expect(order?.payments).toHaveLength(2);
		expect(order?.payments[0]?.status).toBe('paid');
		expect(order?.payments[1]?.status).toBe('canceled');
		// Not fully paid (second canceled) — order must not flip to paid.
		expect(order?.status).not.toBe('paid');
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

	it('persists externalPaymentId and applies each status to the row written for it', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 2);
		const bMinor = totalMinor - aMinor;
		const res = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-ids-1',
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
		expect(res.results[0].status).toBe('created');
		const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
		expect(order?.payments.map((p) => p.externalPaymentId)).toEqual(['pay-b', 'pay-a']);
		const byId = Object.fromEntries(
			(order?.payments ?? []).map((p) => [p.externalPaymentId, p.status])
		);
		expect(byId['pay-a']).toBe('paid');
		expect(byId['pay-b']).toBe('canceled');
	});

	it('applies statuses by position when payments carry no externalPaymentId', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 3);
		const bMinor = totalMinor - aMinor;
		expect(aMinor).not.toBe(bMinor);
		const res = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-position-1',
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
		const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
		expect(order?.payments.map((p) => amountToMinor(p.price.amount, 'EUR'))).toEqual([
			bMinor,
			aMinor
		]);
		expect(order?.payments[0]?.status).toBe('paid'); // bMinor row
		expect(order?.payments[1]?.status).toBe('canceled'); // aMinor row
	});

	it('writes one row per payment, even when two share an externalPaymentId', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 3);
		const res = await writeBatch({
			apiKey,
			orders: [
				{
					externalOrderId: 'multi-shared-id-1',
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
		expect(res.results[0].status).toBe('created');
		const order = await collections.orders.findOne({ _id: requireOrderId(res.results[0]) });
		expect(order?.payments).toHaveLength(2);
		expect(order?.payments[0]?.status).toBe('paid');
		expect(order?.payments[1]?.status).toBe('canceled');
	});

	it('refuses a replay before touching any payment of the existing order', async () => {
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
				paidCommand({ externalOrderId: 'settle-ok-sibling' })
			]
		});
		expect(first.results[0].status).toBe('created');
		expect(first.results[1].status).toBe('created');
		const orderId = requireOrderId(first.results[0]);

		const paySpy = vi.spyOn(ordersModule, 'onOrderPayment');
		const failedSpy = vi.spyOn(ordersModule, 'onOrderPaymentFailed');
		try {
			const second = await writeBatch({
				apiKey,
				orders: [
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
			// Both refused, each on its own: the batch still answers for every command.
			expect(second.results.map((r) => r.error?.code)).toEqual([
				'DUPLICATE_EXTERNAL_ORDER_ID',
				'DUPLICATE_EXTERNAL_ORDER_ID'
			]);
			expect(second.results[1].error?.details).toEqual({ orderId });
			expect(second.status).toBe('ok_with_errors');
			expect(paySpy).not.toHaveBeenCalled();
			expect(failedSpy).not.toHaveBeenCalled();
		} finally {
			paySpy.mockRestore();
			failedSpy.mockRestore();
		}
		const order = await collections.orders.findOne({ _id: orderId });
		expect(order?.status).toBe('pending');
		expect(order?.payments[0]?.status).toBe('pending');
	});

	it('never adds a payment to an existing order on a replay', async () => {
		const totalMinor = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');
		const aMinor = Math.floor(totalMinor / 2);
		// Under-covered on purpose: the order still has room for the payment the replay brings.
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

		const addSpy = vi.spyOn(ordersModule, 'addOrderPayment');
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
			expect(second.results[0]).toMatchObject({
				status: 'failed',
				error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID', details: { orderId } }
			});
			expect(addSpy).not.toHaveBeenCalled();
		} finally {
			addSpy.mockRestore();
		}
		const order = await collections.orders.findOne({ _id: orderId });
		expect(order?.payments.map((p) => p.externalPaymentId)).toEqual(['pay-a', 'pay-tiny']);
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
					// Already sent: refused before any payment is touched (no onOrderPayment call).
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
			expect(res.results[1]).toMatchObject({
				status: 'failed',
				error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID' }
			});
			expect(res.status).toBe('ok_with_errors');
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

		// The external id is on the order — a retry is refused, not a second create.
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
		expect(retry.results[0]).toMatchObject({
			status: 'failed',
			error: { code: 'DUPLICATE_EXTERNAL_ORDER_ID', details: { orderId: createdId } }
		});
		expect(
			await collections.orders.countDocuments({ externalOrderId: 'create-settle-err-1' })
		).toBe(1);
	});
});
