import { describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';
import { toPaidOrderDto } from './listPaid';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

function makeOrder(opts: { paid: boolean; uniqueKey?: string }): Order {
	const amount = 100;
	return {
		_id: 'ord_test',
		number: 1,
		createdAt: new Date('2026-08-01T10:00:00Z'),
		updatedAt: new Date('2026-08-01T10:05:00Z'),
		status: opts.paid ? 'paid' : 'pending',
		items: [
			{
				product: TEST_DIGITAL_PRODUCT,
				quantity: 1,
				uniqueKey: opts.uniqueKey,
				currencySnapshot: {
					main: { price: { amount, currency: 'EUR' } },
					priceReference: { price: { amount, currency: 'EUR' } }
				},
				vatRate: 0
			}
		],
		payments: opts.paid
			? [
					{
						_id: new ObjectId(),
						status: 'paid',
						method: 'point-of-sale',
						price: { amount, currency: 'EUR' },
						currencySnapshot: {
							main: { price: { amount, currency: 'EUR' } },
							priceReference: { price: { amount, currency: 'EUR' } }
						},
						paidAt: new Date('2026-08-01T10:05:00Z')
					}
			  ]
			: [
					{
						_id: new ObjectId(),
						status: 'pending',
						method: 'point-of-sale',
						price: { amount, currency: 'EUR' },
						currencySnapshot: {
							main: { price: { amount, currency: 'EUR' } },
							priceReference: { price: { amount, currency: 'EUR' } }
						}
					}
			  ],
		currencySnapshot: {
			main: {
				totalPrice: { amount, currency: 'EUR' },
				totalReceived: { amount: 0, currency: 'EUR' }
			},
			priceReference: {
				totalPrice: { amount, currency: 'EUR' },
				totalReceived: { amount: 0, currency: 'EUR' }
			}
		}
	} as unknown as Order;
}

describe('toPaidOrderDto', () => {
	it('returns null for unpaid orders (fail-closed)', () => {
		expect(toPaidOrderDto(makeOrder({ paid: false }))).toBeNull();
	});

	it('includes product lines, uniqueKey, and amount actually paid', () => {
		const dto = toPaidOrderDto(makeOrder({ paid: true, uniqueKey: 'kfdjsfeaz12845ND9xezj91820' }));
		expect(dto).not.toBeNull();
		expect(dto?.amountPaid).toEqual({ amountMinor: 10000, currency: 'EUR' });
		expect(dto?.items[0].uniqueKey).toBe('kfdjsfeaz12845ND9xezj91820');
		expect(dto?.items[0].productId).toBe(TEST_DIGITAL_PRODUCT._id);
	});
});

describe('toOrderReadDto', () => {
	it('includes unpaid orders with zero amountPaid', async () => {
		const { toOrderReadDto } = await import('./listPaid');
		const dto = toOrderReadDto(makeOrder({ paid: false }));
		expect(dto.status).toBe('pending');
		expect(dto.amountPaid).toEqual({ amountMinor: 0, currency: 'EUR' });
		expect(dto.paidAt).toBeNull();
	});
});
