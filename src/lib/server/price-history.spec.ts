import { describe, expect, it } from 'vitest';
import {
	buildCatalogue,
	buildPaid,
	catalogueValueAt,
	type BaseSegment,
	type PublicDiscountWindow,
	type PaidSale
} from './price-history';

const DAY = 86_400_000;
const NOW = new Date('2026-06-19T12:00:00.000Z').getTime();
const daysAgo = (n: number) => NOW - n * DAY;

describe('catalogueValueAt', () => {
	const segments: BaseSegment[] = [
		{ from: daysAgo(40), amount: 17.9 },
		{ from: daysAgo(22), amount: 18.9 }
	];

	it('returns null before the first known base price', () => {
		expect(catalogueValueAt(segments, [], daysAgo(50))).toBeNull();
	});

	it('steps with the base price', () => {
		expect(catalogueValueAt(segments, [], daysAgo(30))).toBe(17.9);
		expect(catalogueValueAt(segments, [], daysAgo(10))).toBe(18.9);
	});

	it('folds an active public discount into the catalogue price', () => {
		const windows: PublicDiscountWindow[] = [
			{ percentage: 25, beginsAt: daysAgo(15), endsAt: daysAgo(5) }
		];
		// Inside the window: 18.9 * 0.75 = 14.175 -> 14.18
		expect(catalogueValueAt(segments, windows, daysAgo(10))).toBe(14.18);
		// Outside the window: back to base.
		expect(catalogueValueAt(segments, windows, daysAgo(2))).toBe(18.9);
	});

	it('applies the best (highest) of overlapping public discounts', () => {
		const windows: PublicDiscountWindow[] = [
			{ percentage: 10, beginsAt: daysAgo(15), endsAt: null },
			{ percentage: 30, beginsAt: daysAgo(15), endsAt: null }
		];
		// 18.9 * 0.70 = 13.23
		expect(catalogueValueAt(segments, windows, daysAgo(1))).toBe(13.23);
	});
});

describe('buildCatalogue', () => {
	const segments: BaseSegment[] = [
		{ from: daysAgo(40), amount: 17.9 },
		{ from: daysAgo(22), amount: 18.9 }
	];

	it('computes current price, delta vs previous, and 30-day min/max', () => {
		const res = buildCatalogue(segments, [], NOW);
		expect(res.current).toBe(18.9);
		expect(res.deltaPct).toBe(5.59); // (18.9-17.9)/17.9*100
		expect(res.min30?.price).toBe(17.9);
		expect(res.max30?.price).toBe(18.9);
		// Stepped series ends anchored at "now".
		expect(res.points.at(-1)?.price).toBe(18.9);
		// Distinct price levels: 17.9 then 18.9.
		const levels = res.points.map((p) => p.price);
		expect(levels[0]).toBe(17.9);
		expect(levels).toContain(18.9);
	});

	it('returns empty/null KPIs when there is no price history', () => {
		const res = buildCatalogue([], [], NOW);
		expect(res.points).toEqual([]);
		expect(res.current).toBeNull();
		expect(res.deltaPct).toBeNull();
		expect(res.min30).toBeNull();
	});
});

describe('buildPaid', () => {
	it('computes quantity-weighted daily effective + list points and a 30-day mean', () => {
		const sales: PaidSale[] = [
			// Same day, different quantities -> weighted effective average 13.5, list 18
			{ paidAt: daysAgo(5), effUnit: 15, listUnit: 18, qty: 1 },
			{ paidAt: daysAgo(5), effUnit: 13, listUnit: 18, qty: 3 },
			// Another day -> effective 16, list 18
			{ paidAt: daysAgo(3), effUnit: 16, listUnit: 18, qty: 2 },
			// Outside the 30-day window: counts in points, not in the mean.
			{ paidAt: daysAgo(40), effUnit: 10, listUnit: 12, qty: 1 }
		];
		const res = buildPaid(sales, NOW);

		// 3 distinct days, sorted ascending.
		expect(res.points).toHaveLength(3);
		expect(res.points.map((p) => p.price)).toEqual([10, 13.5, 16]);
		// The list overlay is the snapshotted catalogue price per day.
		expect(res.listPoints.map((p) => p.price)).toEqual([12, 18, 18]);

		// Effective mean over window: (15*1 + 13*3 + 16*2) / (1+3+2) = 86/6 = 14.33
		expect(res.mean).toBe(14.33);
		// vs. the snapshotted list mean (18) over the same window: (1 - 14.33/18) * 100 = 20.39
		expect(res.pctBelowCatalogue).toBe(20.39);
	});

	it('derives % below catalogue from the snapshotted list price, not an external value', () => {
		// Effective == list on every sale -> paid exactly the catalogue price -> 0% below.
		const sales: PaidSale[] = [{ paidAt: daysAgo(2), effUnit: 20, listUnit: 20, qty: 1 }];
		const res = buildPaid(sales, NOW);
		expect(res.mean).toBe(20);
		expect(res.pctBelowCatalogue).toBe(0);
	});

	it('returns null mean when there are no sales', () => {
		const res = buildPaid([], NOW);
		expect(res.points).toEqual([]);
		expect(res.listPoints).toEqual([]);
		expect(res.mean).toBeNull();
		expect(res.pctBelowCatalogue).toBeNull();
	});
});

describe('buildCatalogue with a public discount window', () => {
	const segments: BaseSegment[] = [{ from: daysAgo(40), amount: 20 }];
	const windows: PublicDiscountWindow[] = [
		{ percentage: 25, beginsAt: daysAgo(20), endsAt: daysAgo(10) }
	];

	it('dips to the discounted price during the window and recovers afterwards', () => {
		const res = buildCatalogue(segments, windows, NOW);
		const prices = res.points.map((p) => p.price);
		expect(prices).toContain(15); // 20 * (1 - 0.25)
		expect(prices).toContain(20); // base before/after the window
		expect(res.current).toBe(20); // window already ended
		expect(res.min30?.price).toBe(15); // the discounted dip is the 30-day low
		expect(res.max30?.price).toBe(20);
	});
});

describe('buildCatalogue windowing (sinceMs)', () => {
	const segments: BaseSegment[] = [
		{ from: daysAgo(40), amount: 17.9 },
		{ from: daysAgo(22), amount: 18.9 }
	];

	it('bounds the returned points to the window but keeps full-history KPIs', () => {
		const res = buildCatalogue(segments, [], NOW, 2, daysAgo(10));
		// KPIs are still computed over the full history.
		expect(res.deltaPct).toBe(5.59);
		expect(res.min30?.price).toBe(17.9);
		// Points are limited to the window and anchored at its edge (price in effect then).
		expect(res.points.every((p) => Date.parse(p.t) >= daysAgo(10))).toBe(true);
		expect(res.points[0].price).toBe(18.9);
		expect(res.points.map((p) => p.price)).not.toContain(17.9);
	});
});

describe('buildCatalogue with an edited discount (two sequential windows)', () => {
	it('uses the original percentage before the edit and the new one after', () => {
		const segments: BaseSegment[] = [{ from: daysAgo(60), amount: 20 }];
		// loadPriceFacts now emits one window per event version, clipped to its validity period.
		const windows: PublicDiscountWindow[] = [
			{ percentage: 25, beginsAt: daysAgo(40), endsAt: daysAgo(20) }, // pre-edit
			{ percentage: 30, beginsAt: daysAgo(20), endsAt: null } // post-edit
		];
		const res = buildCatalogue(segments, windows, NOW);
		const prices = res.points.map((p) => p.price);
		expect(prices).toContain(15); // 20 * 0.75, pre-edit period
		expect(prices).toContain(14); // 20 * 0.70, post-edit period
		expect(prices).toContain(20); // base before the discount began
	});
});

describe('currency precision (priceDigits)', () => {
	it('keeps sub-unit prices instead of rounding them to zero', () => {
		const segments: BaseSegment[] = [{ from: daysAgo(5), amount: 0.00037066 }];
		// 8 digits (e.g. BTC): value preserved.
		expect(catalogueValueAt(segments, [], NOW, 8)).toBe(0.00037066);
		// 2 digits (default, e.g. CHF): sub-cent value collapses to 0.
		expect(catalogueValueAt(segments, [], NOW, 2)).toBe(0);
	});
});
