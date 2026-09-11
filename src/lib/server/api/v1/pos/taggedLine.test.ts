import { describe, expect, it } from 'vitest';
import type { Order } from '$lib/types/Order';
import { findTaggedLine } from './taggedLine';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

type LineSpec = {
	id: string;
	tagIds?: string[];
	/** Unit price excluding VAT, as the snapshot records it. */
	unit?: number;
	quantity?: number;
	freeQuantity?: number;
	discountPercentage?: number;
	vatRate?: number;
	uniqueKey?: string;
	currency?: string;
};

function line(spec: LineSpec) {
	const currency = spec.currency ?? 'CHF';
	const unit = spec.unit ?? 20;
	return {
		product: { ...TEST_DIGITAL_PRODUCT, _id: spec.id, tagIds: spec.tagIds },
		quantity: spec.quantity ?? 1,
		...(spec.freeQuantity !== undefined && { freeQuantity: spec.freeQuantity }),
		...(spec.discountPercentage !== undefined && {
			discountPercentage: spec.discountPercentage
		}),
		...(spec.uniqueKey && { uniqueKey: spec.uniqueKey }),
		vatRate: spec.vatRate ?? 0,
		currencySnapshot: {
			main: { price: { amount: unit, currency } },
			priceReference: { price: { amount: unit, currency } }
		}
	};
}

function order(lines: LineSpec[]): Order {
	return { _id: 'ord-1', items: lines.map(line) } as unknown as Order;
}

describe('findTaggedLine', () => {
	it('is null when no line carries the tag', () => {
		expect(findTaggedLine(order([{ id: 'biere', tagIds: ['boissons'] }]), 'recharge')).toBeNull();
	});

	it('is null when a line carries no tag at all', () => {
		expect(findTaggedLine(order([{ id: 'biere' }]), 'recharge')).toBeNull();
	});

	it('finds the one tagged line among untagged ones', () => {
		const found = findTaggedLine(
			order([
				{ id: 'biere', tagIds: ['boissons'], unit: 5 },
				{ id: 'credit', tagIds: ['recharge'], unit: 20 },
				{ id: 'chips', unit: 3 }
			]),
			'recharge'
		);
		expect(found).toMatchObject({ amount: 20, currency: 'CHF' });
	});

	it('refuses rather than choosing when two lines carry the tag', () => {
		expect(
			findTaggedLine(
				order([
					{ id: 'credit-20', tagIds: ['recharge'] },
					{ id: 'credit-50', tagIds: ['recharge'] }
				]),
				'recharge'
			)
		).toBe('ambiguous');
	});

	it('matches a line whose product carries the tag among several', () => {
		const found = findTaggedLine(
			order([{ id: 'credit', tagIds: ['pos-favorite', 'recharge', 'promo'] }]),
			'recharge'
		);
		expect(found).not.toBeNull();
	});

	it('matches on the tag as stored, without case folding', () => {
		expect(findTaggedLine(order([{ id: 'credit', tagIds: ['recharge'] }]), 'Recharge')).toBeNull();
	});

	describe('the amount it reports', () => {
		it('includes VAT, since that is what was received', () => {
			expect(
				findTaggedLine(order([{ id: 'credit', tagIds: ['t'], unit: 100, vatRate: 8.1 }]), 't')
			).toMatchObject({ amount: 108.1, vat: { rate: 8.1, amount: 8.1 } });
		});

		it('carries no VAT entry when the line is rated at zero', () => {
			expect(
				findTaggedLine(order([{ id: 'credit', tagIds: ['t'], unit: 20, vatRate: 0 }]), 't')
			).toMatchObject({ amount: 20, vat: null });
		});

		it('multiplies by the quantity', () => {
			expect(
				findTaggedLine(order([{ id: 'credit', tagIds: ['t'], unit: 20, quantity: 3 }]), 't')
			).toMatchObject({ amount: 60 });
		});

		it('bills only the units actually charged, not the ones given away', () => {
			expect(
				findTaggedLine(
					order([{ id: 'credit', tagIds: ['t'], unit: 20, quantity: 3, freeQuantity: 1 }]),
					't'
				)
			).toMatchObject({ amount: 40 });
		});

		it('is zero when every unit was given away', () => {
			expect(
				findTaggedLine(
					order([{ id: 'credit', tagIds: ['t'], unit: 20, quantity: 2, freeQuantity: 2 }]),
					't'
				)
			).toMatchObject({ amount: 0 });
		});

		it('applies a line discount, since that changed what was charged', () => {
			expect(
				findTaggedLine(
					order([{ id: 'credit', tagIds: ['t'], unit: 20, discountPercentage: 25 }]),
					't'
				)
			).toMatchObject({ amount: 15 });
		});

		it('composes quantity, free units and discount as the till did', () => {
			// 4 units, 1 free, 20 each less 50% → 3 × 10.
			expect(
				findTaggedLine(
					order([
						{
							id: 'credit',
							tagIds: ['t'],
							unit: 20,
							quantity: 4,
							freeQuantity: 1,
							discountPercentage: 50
						}
					]),
					't'
				)
			).toMatchObject({ amount: 30 });
		});

		it('reports the currency the line was charged in', () => {
			expect(
				findTaggedLine(order([{ id: 'credit', tagIds: ['t'], currency: 'EUR' }]), 't')
			).toMatchObject({ currency: 'EUR' });
		});
	});

	describe('the key it reports', () => {
		it('carries the storefront ?key= of the tagged line', () => {
			expect(
				findTaggedLine(order([{ id: 'credit', tagIds: ['t'], uniqueKey: '3Qz8yTaVbNk7' }]), 't')
			).toMatchObject({ key: '3Qz8yTaVbNk7' });
		});

		it('omits it when the line carried none', () => {
			expect(findTaggedLine(order([{ id: 'credit', tagIds: ['t'] }]), 't')).not.toHaveProperty(
				'key'
			);
		});

		it('takes the key of the tagged line, not of another line that has one', () => {
			expect(
				findTaggedLine(
					order([
						{ id: 'biere', uniqueKey: 'wrong-key' },
						{ id: 'credit', tagIds: ['t'], uniqueKey: 'right-key' }
					]),
					't'
				)
			).toMatchObject({ key: 'right-key' });
		});
	});

	it('is null when the line has no main currency snapshot to price from', () => {
		const broken = order([{ id: 'credit', tagIds: ['t'] }]);
		(broken.items[0] as { currencySnapshot?: unknown }).currencySnapshot = undefined;
		expect(findTaggedLine(broken, 't')).toBeNull();
	});
});
