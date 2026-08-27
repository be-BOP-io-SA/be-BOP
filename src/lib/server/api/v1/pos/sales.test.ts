import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';

const find = vi.fn();
const writeBatch = vi.fn();

vi.mock('$lib/server/database', () => ({
	collections: { orders: { find: (...args: unknown[]) => find(...args) } }
}));
vi.mock('$lib/server/env-config', () => ({ ORIGIN: 'https://shop.example' }));
vi.mock('../orders/writeBatch', () => ({
	writeBatch: (...args: unknown[]) => writeBatch(...args)
}));

import { ingestPosSales, orderUrl, posSaleMatchesOrder, toOrderWriteCommand } from './sales';
import type { PosSale } from './schemas';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

const apiKey = {
	_id: new ObjectId(),
	name: 't',
	scopes: ['orders:write' as const],
	keyPrefix: 'bebop_ak_test_abcd1234'
};

function sale(overrides?: Partial<PosSale>): PosSale {
	return {
		externalOrderId: 'sale-1',
		soldAt: '2026-07-29T14:03:00.000Z',
		method: 'cashless',
		totalPrice: { amount: 12.5, currency: 'CHF' },
		items: [{ product: 'tartiflette', quantity: 1, price: { amount: 12.5, currency: 'CHF' } }],
		...overrides
	} as PosSale;
}

function orderFor(s: PosSale, overrides?: Partial<Order>): Order {
	return {
		_id: 'ord-1',
		number: 1,
		externalOrderId: s.externalOrderId,
		externalSourceApiKeyId: apiKey._id,
		createdAt: new Date(s.soldAt),
		updatedAt: new Date(s.soldAt),
		status: 'paid',
		items: s.items.map((item) => ({
			product: { ...TEST_DIGITAL_PRODUCT, _id: item.product },
			quantity: item.quantity,
			currencySnapshot: {
				main: { price: { amount: item.price.amount, currency: item.price.currency } },
				priceReference: { price: { amount: item.price.amount, currency: item.price.currency } }
			},
			vatRate: 0
		})),
		payments: [],
		currencySnapshot: {
			main: { totalPrice: { amount: s.totalPrice.amount, currency: s.totalPrice.currency } },
			priceReference: {
				totalPrice: { amount: s.totalPrice.amount, currency: s.totalPrice.currency }
			}
		},
		sellerIdentity: null,
		notifications: { paymentStatus: {} },
		user: {},
		locale: 'en',
		...overrides
	} as unknown as Order;
}

describe('orderUrl', () => {
	it('points at the be-BOP order page', () => {
		expect(orderUrl('ord-1')).toBe('https://shop.example/order/ord-1');
	});
});

describe('toOrderWriteCommand', () => {
	it('carries the caller reference straight onto the general API idempotency key', () => {
		expect(toOrderWriteCommand(sale()).externalOrderId).toBe('sale-1');
	});

	it('keeps soldAt as the order date, not the ingestion time', () => {
		expect(toOrderWriteCommand(sale()).createdAt).toBe('2026-07-29T14:03:00.000Z');
	});

	it('sends the unit price the till charged, in minor units', () => {
		expect(toOrderWriteCommand(sale()).items[0].customPrice).toEqual({
			amountMinor: 1250,
			currency: 'CHF'
		});
	});

	it('maps the seam method onto be-BOP two-level payment model', () => {
		// `method` is the axis, `posLabel` the subtype resolved against the shop's configured
		// posPaymentSubtypes. The seam flattens both into one field, so its value becomes the label.
		expect(toOrderWriteCommand(sale()).payment).toEqual({
			method: 'point-of-sale',
			status: 'paid',
			amountMinor: 1250,
			currency: 'CHF',
			posLabel: 'cashless'
		});
	});
});

describe('posSaleMatchesOrder', () => {
	it('accepts an identical re-push', () => {
		const s = sale();
		expect(posSaleMatchesOrder(s, orderFor(s))).toBe(true);
	});

	it('compares amounts numerically', () => {
		const s = sale();
		const order = orderFor(s);
		order.currencySnapshot.main.totalPrice.amount = 12.5000000001;
		expect(posSaleMatchesOrder(s, order)).toBe(true);
	});

	it('rejects a different total, currency, or instant', () => {
		const s = sale();
		expect(
			posSaleMatchesOrder(sale({ totalPrice: { amount: 13, currency: 'CHF' } }), orderFor(s))
		).toBe(false);
		expect(
			posSaleMatchesOrder(sale({ totalPrice: { amount: 12.5, currency: 'EUR' } }), orderFor(s))
		).toBe(false);
		expect(posSaleMatchesOrder(sale({ soldAt: '2026-07-29T15:03:00.000Z' }), orderFor(s))).toBe(
			false
		);
	});

	it('rejects a different product, quantity, or unit price', () => {
		const s = sale();
		expect(
			posSaleMatchesOrder(
				sale({
					items: [{ product: 'banane', quantity: 1, price: { amount: 12.5, currency: 'CHF' } }]
				}),
				orderFor(s)
			)
		).toBe(false);
		expect(
			posSaleMatchesOrder(
				sale({
					items: [{ product: 'tartiflette', quantity: 2, price: { amount: 12.5, currency: 'CHF' } }]
				}),
				orderFor(s)
			)
		).toBe(false);
		expect(
			posSaleMatchesOrder(
				sale({
					items: [{ product: 'tartiflette', quantity: 1, price: { amount: 9, currency: 'CHF' } }]
				}),
				orderFor(s)
			)
		).toBe(false);
	});

	it('rejects a different number of lines', () => {
		const s = sale();
		const order = orderFor(s);
		order.items = [];
		expect(posSaleMatchesOrder(s, order)).toBe(false);
	});
});

/** Unwraps the success arm, so a test that expects sales to land fails loudly on a rejection. */
async function ingestOk(...args: Parameters<typeof ingestPosSales>) {
	const res = await ingestPosSales(...args);
	if (!('response' in res)) {
		throw new Error(`expected a response, got a rejection: ${JSON.stringify(res.rejection)}`);
	}
	return res.response;
}

/** Unwraps the rejection arm. */
async function ingestRejected(...args: Parameters<typeof ingestPosSales>) {
	const res = await ingestPosSales(...args);
	if (!('rejection' in res)) {
		throw new Error(`expected a rejection, got a response: ${JSON.stringify(res.response)}`);
	}
	return res.rejection;
}

describe('ingestPosSales', () => {
	beforeEach(() => {
		find.mockReset();
		find.mockReturnValue({ toArray: async () => [] });
		writeBatch.mockReset();
		writeBatch.mockResolvedValue({ ok: true, status: 'ok', results: [] });
	});

	it('writes a sale it has never seen', async () => {
		writeBatch.mockResolvedValue({
			ok: true,
			status: 'ok',
			results: [{ externalOrderId: 'sale-1', status: 'created', orderId: 'ord-1' }]
		});
		const res = await ingestOk({ apiKey, sales: [sale()] });
		expect(res.results).toEqual([
			{ externalOrderId: 'sale-1', status: 'success', orderUrl: 'https://shop.example/order/ord-1' }
		]);
	});

	it('scopes the known-reference lookup to the calling key', async () => {
		writeBatch.mockResolvedValue({
			ok: true,
			status: 'ok',
			results: [{ externalOrderId: 'sale-1', status: 'created', orderId: 'ord-1' }]
		});
		await ingestOk({ apiKey, sales: [sale()] });
		expect(find.mock.calls[0][0]).toEqual({
			externalSourceApiKeyId: apiKey._id,
			externalOrderId: { $in: ['sale-1'] }
		});
	});

	it('answers success on an identical re-push, without writing again', async () => {
		const s = sale();
		find.mockReturnValue({ toArray: async () => [orderFor(s)] });
		const res = await ingestOk({ apiKey, sales: [s] });
		expect(res.results[0]).toEqual({
			externalOrderId: 'sale-1',
			status: 'success',
			orderUrl: 'https://shop.example/order/ord-1'
		});
		expect(writeBatch).not.toHaveBeenCalled();
	});

	it('answers conflict when the same reference carries different goods', async () => {
		find.mockReturnValue({ toArray: async () => [orderFor(sale())] });
		const res = await ingestOk({
			apiKey,
			sales: [sale({ totalPrice: { amount: 99, currency: 'CHF' } })]
		});
		expect(res.results[0]).toMatchObject({ externalOrderId: 'sale-1', status: 'conflict' });
		expect(writeBatch).not.toHaveBeenCalled();
	});

	it('throws on a failure a retry could clear, so the caller keeps retrying', async () => {
		// Both statuses require an orderUrl, so a sale with no order fits neither. An INTERNAL_ERROR
		// carries no HTTP status: nothing says the caller did anything wrong.
		writeBatch.mockResolvedValue({
			ok: false,
			status: 'ok_with_errors',
			results: [
				{
					externalOrderId: 'sale-1',
					status: 'failed',
					error: { code: 'INTERNAL_ERROR', message: 'boom' }
				}
			]
		});
		await expect(ingestPosSales({ apiKey, sales: [sale()] })).rejects.toThrow(
			/could not be ingested/
		);
	});

	it('rejects a currency the shop does not support instead of throwing', async () => {
		writeBatch.mockResolvedValue({
			ok: false,
			status: 'ok_with_errors',
			results: [
				{
					externalOrderId: 'sale-1',
					status: 'failed',
					error: {
						code: 'CURRENCY_UNSUPPORTED',
						message: 'Order currency SEK does not match shop main currency CHF',
						details: { orderCurrency: 'SEK', mainCurrency: 'CHF' }
					}
				}
			]
		});
		const rejection = await ingestRejected({ apiKey, sales: [sale()] });
		expect(rejection).toEqual({
			externalOrderId: 'sale-1',
			code: 'CURRENCY_UNSUPPORTED',
			message: 'Order currency SEK does not match shop main currency CHF',
			details: { orderCurrency: 'SEK', mainCurrency: 'CHF' },
			ingested: []
		});
	});

	it('rejects a 4xx the domain raised', async () => {
		writeBatch.mockResolvedValue({
			ok: false,
			status: 'ok_with_errors',
			results: [
				{
					externalOrderId: 'sale-1',
					status: 'failed',
					error: {
						code: 'STOCK_UNAVAILABLE',
						message: 'Product tartiflette is out of stock',
						details: { httpStatus: 400 }
					}
				}
			]
		});
		const rejection = await ingestRejected({ apiKey, sales: [sale()] });
		expect(rejection.code).toBe('STOCK_UNAVAILABLE');
		expect(rejection.externalOrderId).toBe('sale-1');
	});

	it('throws on a 5xx the domain raised, which a retry may clear', async () => {
		writeBatch.mockResolvedValue({
			ok: false,
			status: 'ok_with_errors',
			results: [
				{
					externalOrderId: 'sale-1',
					status: 'failed',
					error: { code: 'DOMAIN_ERROR', message: 'upstream down', details: { httpStatus: 503 } }
				}
			]
		});
		await expect(ingestPosSales({ apiKey, sales: [sale()] })).rejects.toThrow(/upstream down/);
	});

	it.each([408, 429])('throws on %i, the 4xx a later attempt clears on its own', async (status) => {
		writeBatch.mockResolvedValue({
			ok: false,
			status: 'ok_with_errors',
			results: [
				{
					externalOrderId: 'sale-1',
					status: 'failed',
					error: { code: 'DOMAIN_ERROR', message: 'slow down', details: { httpStatus: status } }
				}
			]
		});
		await expect(ingestPosSales({ apiKey, sales: [sale()] })).rejects.toThrow(/slow down/);
	});

	it('names the sales of the batch that landed, wherever the refusal sat', async () => {
		// writeBatch runs every command, so a refusal in the middle does not stop the ones after it.
		writeBatch.mockResolvedValue({
			ok: false,
			status: 'ok_with_errors',
			results: [
				{ externalOrderId: 'sale-a', status: 'created', orderId: 'ord-a' },
				{
					externalOrderId: 'sale-b',
					status: 'failed',
					error: { code: 'CURRENCY_UNSUPPORTED', message: 'nope' }
				},
				{ externalOrderId: 'sale-c', status: 'created', orderId: 'ord-c' }
			]
		});
		const rejection = await ingestRejected({
			apiKey,
			sales: [
				sale({ externalOrderId: 'sale-a' }),
				sale({ externalOrderId: 'sale-b' }),
				sale({ externalOrderId: 'sale-c' })
			]
		});
		expect(rejection.externalOrderId).toBe('sale-b');
		expect(rejection.ingested).toEqual(['sale-a', 'sale-c']);
	});

	it('omits details when the refusal carries none', async () => {
		writeBatch.mockResolvedValue({
			ok: false,
			status: 'ok_with_errors',
			results: [
				{
					externalOrderId: 'sale-1',
					status: 'failed',
					error: { code: 'CURRENCY_UNSUPPORTED', message: 'nope' }
				}
			]
		});
		const rejection = await ingestRejected({ apiKey, sales: [sale()] });
		expect('details' in rejection).toBe(false);
	});

	it('fails rather than emit a result without the orderUrl the seam requires', async () => {
		writeBatch.mockResolvedValue({
			ok: true,
			status: 'ok',
			results: [{ externalOrderId: 'sale-1', status: 'created' }]
		});
		await expect(ingestPosSales({ apiKey, sales: [sale()] })).rejects.toThrow(/no order produced/);
	});

	it('answers in the order the till pushed, mixing known and fresh references', async () => {
		const known = sale({ externalOrderId: 'sale-known' });
		find.mockReturnValue({ toArray: async () => [orderFor(known)] });
		writeBatch.mockResolvedValue({
			ok: true,
			status: 'ok',
			results: [{ externalOrderId: 'sale-new', status: 'created', orderId: 'ord-2' }]
		});
		const res = await ingestOk({
			apiKey,
			sales: [sale({ externalOrderId: 'sale-new' }), known]
		});
		expect(res.results.map((r) => r.externalOrderId)).toEqual(['sale-new', 'sale-known']);
		expect(writeBatch.mock.calls[0][0].orders).toHaveLength(1);
	});
});
