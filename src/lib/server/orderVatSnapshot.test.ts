import { describe, it, expect } from 'vitest';
import { orderVatAccountingSnapshot } from './orderVatSnapshot';
import type { Order } from '$lib/types/Order';

// Minimal order carrying only what the snapshot reads. Mirrors the issue #2492 scenario:
// main/accounting in EUR, priceReference in CHF, secondary in BTC — and NEVER SAT.
function makeOrder(overrides: Partial<Order['currencySnapshot']> = {}): Order {
	const currencySnapshot = {
		main: {
			totalPrice: { amount: 7.24, currency: 'EUR' },
			vat: [{ amount: 0.54, currency: 'EUR' }]
		},
		priceReference: {
			totalPrice: { amount: 6.66, currency: 'CHF' },
			vat: [{ amount: 0.5, currency: 'CHF' }]
		},
		secondary: {
			totalPrice: { amount: 0.00012, currency: 'BTC' },
			vat: [{ amount: 0.0000089, currency: 'BTC' }]
		},
		accounting: {
			totalPrice: { amount: 7.24, currency: 'EUR' },
			vat: [{ amount: 0.54, currency: 'EUR' }]
		},
		...overrides
	} as Order['currencySnapshot'];

	return {
		vat: [{ rate: 8.1, country: 'CH' }],
		currencySnapshot
	} as unknown as Order;
}

describe('orderVatAccountingSnapshot', () => {
	it('snapshots VAT in every configured currency, never SAT', () => {
		const snap = orderVatAccountingSnapshot(makeOrder());

		expect(snap.rates).toEqual([{ rate: 8.1, country: 'CH' }]);
		expect(snap.main).toEqual([{ amount: 0.54, currency: 'EUR' }]);
		expect(snap.priceReference).toEqual([{ amount: 0.5, currency: 'CHF' }]);
		expect(snap.secondary).toEqual([{ amount: 0.0000089, currency: 'BTC' }]);
		expect(snap.accounting).toEqual([{ amount: 0.54, currency: 'EUR' }]);

		// No amount is ever expressed in the internal SAT unit.
		const currencies = [snap.main, snap.priceReference, snap.secondary, snap.accounting]
			.flat()
			.map((p) => p?.currency);
		expect(currencies).not.toContain('SAT');
	});

	it('omits secondary/accounting when the shop has not configured them', () => {
		const order = makeOrder();
		delete (order.currencySnapshot as { secondary?: unknown }).secondary;
		delete (order.currencySnapshot as { accounting?: unknown }).accounting;

		const snap = orderVatAccountingSnapshot(order);

		expect(snap).not.toHaveProperty('secondary');
		expect(snap).not.toHaveProperty('accounting');
		// main and priceReference are always present.
		expect(snap.main).toBeDefined();
		expect(snap.priceReference).toBeDefined();
	});
});
