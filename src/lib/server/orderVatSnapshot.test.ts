import { describe, it, expect } from 'vitest';
import { orderCurrencyAmounts, orderVatAccountingSnapshot } from './orderVatSnapshot';
import type { Order } from '$lib/types/Order';

// Minimal order carrying only what the snapshot reads. Mirrors the issue #2492 scenario:
// main/accounting in EUR, priceReference in CHF, secondary in BTC — and NEVER SAT.
function makeOrder(): Order {
	const currencySnapshot = {
		main: {
			totalPrice: { amount: 7.24, currency: 'EUR' },
			vat: [{ amount: 0.54, currency: 'EUR' }],
			discount: { amount: 1, currency: 'EUR' }
		},
		priceReference: {
			totalPrice: { amount: 6.66, currency: 'CHF' },
			vat: [{ amount: 0.5, currency: 'CHF' }],
			discount: { amount: 0.92, currency: 'CHF' }
		},
		secondary: {
			totalPrice: { amount: 0.00012, currency: 'BTC' },
			vat: [{ amount: 0.0000089, currency: 'BTC' }]
		},
		accounting: {
			totalPrice: { amount: 7.24, currency: 'EUR' },
			vat: [{ amount: 0.54, currency: 'EUR' }]
		}
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
		expect(snap.main).toBeDefined();
		expect(snap.priceReference).toBeDefined();
	});

	it('reports no rate rows when there are no per-currency VAT amounts', () => {
		const order = makeOrder();
		// Rate rows present but no snapshotted amounts (e.g. a zero-total-VAT order).
		delete (order.currencySnapshot.main as { vat?: unknown }).vat;
		delete (order.currencySnapshot.priceReference as { vat?: unknown }).vat;
		delete (order.currencySnapshot.secondary as { vat?: unknown }).vat;
		delete (order.currencySnapshot.accounting as { vat?: unknown }).vat;

		const snap = orderVatAccountingSnapshot(order);

		expect(snap.rates).toEqual([]);
		expect(snap).not.toHaveProperty('main');
		expect(snap).not.toHaveProperty('priceReference');
	});
});

describe('orderCurrencyAmounts', () => {
	it('projects a field across every configured currency', () => {
		const totals = orderCurrencyAmounts(makeOrder(), (entry) => entry.totalPrice);

		expect(totals).toEqual({
			main: { amount: 7.24, currency: 'EUR' },
			priceReference: { amount: 6.66, currency: 'CHF' },
			secondary: { amount: 0.00012, currency: 'BTC' },
			accounting: { amount: 7.24, currency: 'EUR' }
		});
	});

	it('omits currencies where the field is absent (e.g. no discount)', () => {
		// secondary/accounting in makeOrder() carry no discount.
		const discounts = orderCurrencyAmounts(makeOrder(), (entry) => entry.discount);

		expect(discounts).toEqual({
			main: { amount: 1, currency: 'EUR' },
			priceReference: { amount: 0.92, currency: 'CHF' }
		});
	});
});
