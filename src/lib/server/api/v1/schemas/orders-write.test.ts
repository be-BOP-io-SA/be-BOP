import { describe, expect, it } from 'vitest';
import { ordersWriteRequestSchema } from './orders-write';

const validOrder = {
	externalOrderId: 'pos-1',
	currency: 'EUR' as const,
	items: [{ productId: 'espresso', quantity: 1 }],
	payment: {
		method: 'point-of-sale' as const,
		status: 'paid' as const,
		amountMinor: 350,
		currency: 'EUR' as const
	}
};

describe('ordersWriteRequestSchema', () => {
	it('accepts a minimal valid batch', () => {
		const parsed = ordersWriteRequestSchema.safeParse({ orders: [validOrder] });
		expect(parsed.success).toBe(true);
	});

	it('accepts customPrice in minor units', () => {
		const parsed = ordersWriteRequestSchema.safeParse({
			orders: [
				{
					...validOrder,
					items: [
						{
							productId: 'espresso',
							quantity: 2,
							customPrice: { amountMinor: 300, currency: 'EUR' }
						}
					]
				}
			]
		});
		expect(parsed.success).toBe(true);
	});

	it('accepts exactly 100 orders (upper bound inclusive)', () => {
		const orders = Array.from({ length: 100 }, (_, i) => ({
			...validOrder,
			externalOrderId: `pos-${i}`
		}));
		expect(ordersWriteRequestSchema.safeParse({ orders }).success).toBe(true);
	});

	it('rejects an empty batch', () => {
		const parsed = ordersWriteRequestSchema.safeParse({ orders: [] });
		expect(parsed.success).toBe(false);
	});

	it('rejects more than 100 orders (N=101)', () => {
		const orders = Array.from({ length: 101 }, (_, i) => ({
			...validOrder,
			externalOrderId: `pos-${i}`
		}));
		const parsed = ordersWriteRequestSchema.safeParse({ orders });
		expect(parsed.success).toBe(false);
	});

	// Documentary: .strict() rejects client-supplied currencySnapshot (D4) without a custom refine.
	it('rejects currencySnapshot via .strict() (D4)', () => {
		const parsed = ordersWriteRequestSchema.safeParse({
			orders: [{ ...validOrder, currencySnapshot: { main: {} } }]
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects currencySnapshot nested on items/payment via .strict()', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...validOrder,
						items: [{ productId: 'x', quantity: 1, currencySnapshot: {} }]
					}
				]
			}).success
		).toBe(false);
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...validOrder,
						payment: { ...validOrder.payment, currencySnapshot: { EUR: 1 } }
					}
				]
			}).success
		).toBe(false);
	});

	it('rejects non point-of-sale payment methods', () => {
		const parsed = ordersWriteRequestSchema.safeParse({
			orders: [
				{
					...validOrder,
					payment: { ...validOrder.payment, method: 'card' }
				}
			]
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects missing externalOrderId', () => {
		const rest = {
			currency: validOrder.currency,
			items: validOrder.items,
			payment: validOrder.payment
		};
		const parsed = ordersWriteRequestSchema.safeParse({ orders: [rest] });
		expect(parsed.success).toBe(false);
	});

	it('rejects empty / whitespace-only externalOrderId', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [{ ...validOrder, externalOrderId: '' }]
			}).success
		).toBe(false);
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [{ ...validOrder, externalOrderId: '   ' }]
			}).success
		).toBe(false);
	});

	it('rejects externalOrderId longer than 200 chars', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [{ ...validOrder, externalOrderId: 'x'.repeat(201) }]
			}).success
		).toBe(false);
	});

	it('rejects non-integer amountMinor', () => {
		const parsed = ordersWriteRequestSchema.safeParse({
			orders: [
				{
					...validOrder,
					payment: { ...validOrder.payment, amountMinor: 3.5 }
				}
			]
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects negative amountMinor and string amounts', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...validOrder,
						payment: { ...validOrder.payment, amountMinor: -1 }
					}
				]
			}).success
		).toBe(false);
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...validOrder,
						payment: { ...validOrder.payment, amountMinor: '350' }
					}
				]
			}).success
		).toBe(false);
	});

	it('rejects negative customPrice.amountMinor', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...validOrder,
						items: [
							{
								productId: 'espresso',
								quantity: 1,
								customPrice: { amountMinor: -5, currency: 'EUR' }
							}
						]
					}
				]
			}).success
		).toBe(false);
	});

	it('rejects unknown root keys via .strict()', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [validOrder],
				extra: true
			}).success
		).toBe(false);
	});

	it('rejects payment.currency differing from order.currency', () => {
		const parsed = ordersWriteRequestSchema.safeParse({
			orders: [
				{
					...validOrder,
					payment: { ...validOrder.payment, currency: 'USD' }
				}
			]
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects customPrice.currency differing from order.currency', () => {
		const parsed = ordersWriteRequestSchema.safeParse({
			orders: [
				{
					...validOrder,
					items: [
						{
							productId: 'espresso',
							quantity: 1,
							customPrice: { amountMinor: 300, currency: 'USD' }
						}
					]
				}
			]
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects customFields with more than 50 keys', () => {
		const customFields = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, 'v']));
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [{ ...validOrder, customFields }]
			}).success
		).toBe(false);
	});

	it('rejects customFields key longer than 100 chars', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [{ ...validOrder, customFields: { ['x'.repeat(101)]: 'v' } }]
			}).success
		).toBe(false);
	});

	it('rejects createdAt outside ±365 days', () => {
		const far = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString();
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [{ ...validOrder, createdAt: far }]
			}).success
		).toBe(false);
	});

	it('accepts createdAt within ±365 days', () => {
		const near = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [{ ...validOrder, createdAt: near }]
			}).success
		).toBe(true);
	});

	it('accepts payments array instead of singular payment', () => {
		const { payment, ...rest } = validOrder;
		const parsed = ordersWriteRequestSchema.safeParse({
			orders: [
				{
					...rest,
					payments: [
						{ ...payment, amountMinor: 200, status: 'paid' },
						{ ...payment, amountMinor: 150, status: 'pending' }
					]
				}
			]
		});
		expect(parsed.success).toBe(true);
	});

	it('rejects when neither payment nor payments is provided', () => {
		const { payment, ...rest } = validOrder;
		expect(payment).toBeDefined();
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [rest]
			}).success
		).toBe(false);
	});

	it('prefers payments over payment when both are set', () => {
		const parsed = ordersWriteRequestSchema.safeParse({
			orders: [
				{
					...validOrder,
					payments: [{ ...validOrder.payment, amountMinor: 100 }]
				}
			]
		});
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.orders[0].payments).toHaveLength(1);
			expect(parsed.data.orders[0].payment).toBeTruthy();
		}
	});

	it('accepts optional externalPaymentId on payment/payments', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...validOrder,
						payment: { ...validOrder.payment, externalPaymentId: 'pos-pay-1' }
					}
				]
			}).success
		).toBe(true);
		const { payment, ...rest } = validOrder;
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...rest,
						payments: [
							{ ...payment, amountMinor: 200, externalPaymentId: 'a' },
							{ ...payment, amountMinor: 150, externalPaymentId: 'b' }
						]
					}
				]
			}).success
		).toBe(true);
	});

	it('rejects empty or oversized externalPaymentId', () => {
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...validOrder,
						payment: { ...validOrder.payment, externalPaymentId: '' }
					}
				]
			}).success
		).toBe(false);
		expect(
			ordersWriteRequestSchema.safeParse({
				orders: [
					{
						...validOrder,
						payment: { ...validOrder.payment, externalPaymentId: 'x'.repeat(201) }
					}
				]
			}).success
		).toBe(false);
	});
});
