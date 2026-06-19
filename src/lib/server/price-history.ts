import { subDays, startOfDay } from 'date-fns';
import { collections } from './database';
import { orderIndividualItemPrice } from '$lib/types/Order';
import { FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';

/** A point on a stepped/daily price series. */
export interface PricePoint {
	/** ISO timestamp of the point (start of the segment for stepped series). */
	t: string;
	price: number;
}

export interface PriceHistory {
	currency: Currency;
	catalogue: CatalogueHistory;
	paid: PaidHistory;
}

export interface CatalogueHistory {
	points: PricePoint[];
	/** Latest catalogue price. */
	current: number | null;
	/** Variation vs the previous distinct catalogue price, in percent. */
	deltaPct: number | null;
	/** Min/Max over the rolling 30-day window. */
	min30: { price: number; date: string } | null;
	max30: { price: number; date: string } | null;
}

export interface PaidHistory {
	/** One point per day with at least one paid sale (quantity-weighted unit price). */
	points: PricePoint[];
	/** Quantity-weighted mean effective unit price over the rolling 30-day window. */
	mean: number | null;
	/** How far the mean sits below the current catalogue price, in percent. */
	pctBelowCatalogue: number | null;
}

const DAY_MS = 86_400_000;
// Prices are rounded to the currency's fraction digits (BTC needs 8, not 2);
// percentages stay at 2 decimals.
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
const round2 = (n: number) => round(n, 2);

export interface BaseSegment {
	from: number;
	amount: number;
}
export interface PublicDiscountWindow {
	percentage: number;
	beginsAt: number;
	endsAt: number | null;
}
export interface PaidSale {
	paidAt: number;
	unit: number;
	qty: number;
}

/**
 * Effective catalogue price at instant `t`: the base price in effect, with the
 * best active public 0-criteria discount folded in (issue #2504). Returns null
 * before the first known base price.
 */
export function catalogueValueAt(
	segments: BaseSegment[],
	windows: PublicDiscountWindow[],
	t: number,
	priceDigits = 2
): number | null {
	let base: number | null = null;
	for (const seg of segments) {
		if (seg.from <= t) {
			base = seg.amount;
		}
	}
	if (base === null) {
		return null;
	}
	let pct = 0;
	for (const w of windows) {
		if (w.beginsAt <= t && (w.endsAt === null || t < w.endsAt)) {
			pct = Math.max(pct, w.percentage);
		}
	}
	return round(base * (1 - pct / 100), priceDigits);
}

/** Build the stepped catalogue series + KPIs from immutable price facts. */
export function buildCatalogue(
	segments: BaseSegment[],
	windows: PublicDiscountWindow[],
	now: number,
	priceDigits = 2
): CatalogueHistory {
	const firstAt = segments.length
		? segments.reduce((min, s) => Math.min(min, s.from), segments[0].from)
		: null;

	const points: PricePoint[] = [];
	if (firstAt !== null) {
		let prev: number | null = null;
		for (let t = startOfDay(new Date(firstAt)).getTime(); t <= now; t += DAY_MS) {
			const price = catalogueValueAt(segments, windows, t, priceDigits);
			if (price !== null && price !== prev) {
				points.push({ t: new Date(t).toISOString(), price });
				prev = price;
			}
		}
		const nowPrice = catalogueValueAt(segments, windows, now, priceDigits);
		if (nowPrice !== null) {
			points.push({ t: new Date(now).toISOString(), price: nowPrice });
		}
	}

	const current = catalogueValueAt(segments, windows, now, priceDigits);

	let deltaPct: number | null = null;
	const distinct = points.filter((p, i, arr) => i === 0 || p.price !== arr[i - 1].price);
	if (distinct.length >= 2 && current !== null) {
		const prevPrice = distinct[distinct.length - 2].price;
		if (prevPrice) {
			deltaPct = round2(((current - prevPrice) / prevPrice) * 100);
		}
	}

	let min30: CatalogueHistory['min30'] = null;
	let max30: CatalogueHistory['max30'] = null;
	if (firstAt !== null) {
		const windowStart = subDays(new Date(now), 30).getTime();
		for (let t = Math.max(windowStart, firstAt); t <= now; t += DAY_MS) {
			const price = catalogueValueAt(segments, windows, t, priceDigits);
			if (price === null) {
				continue;
			}
			const date = new Date(t).toISOString();
			if (!min30 || price < min30.price) {
				min30 = { price, date };
			}
			if (!max30 || price >= max30.price) {
				max30 = { price, date };
			}
		}
	}

	return { points, current, deltaPct, min30, max30 };
}

/** Build the daily average-paid series + KPIs from real paid sales. */
export function buildPaid(
	sales: PaidSale[],
	currentCatalogue: number | null,
	now: number,
	priceDigits = 2
): PaidHistory {
	const windowStart = subDays(new Date(now), 30).getTime();
	const dayBuckets = new Map<string, { sum: number; qty: number }>();
	let windowSum = 0;
	let windowQty = 0;

	for (const sale of sales) {
		const key = startOfDay(new Date(sale.paidAt)).toISOString();
		const bucket = dayBuckets.get(key) ?? { sum: 0, qty: 0 };
		bucket.sum += sale.unit * sale.qty;
		bucket.qty += sale.qty;
		dayBuckets.set(key, bucket);
		if (sale.paidAt >= windowStart) {
			windowSum += sale.unit * sale.qty;
			windowQty += sale.qty;
		}
	}

	const points: PricePoint[] = [...dayBuckets.entries()]
		.map(([t, b]) => ({ t, price: round(b.sum / b.qty, priceDigits) }))
		.sort((a, b) => a.t.localeCompare(b.t));

	const mean = windowQty > 0 ? round(windowSum / windowQty, priceDigits) : null;
	const pctBelowCatalogue =
		mean !== null && currentCatalogue ? round2((1 - mean / currentCatalogue) * 100) : null;

	return { points, mean, pctBelowCatalogue };
}

/**
 * Loads the immutable price facts for a product from the accounting logs:
 * base price changes (`productPriceUpdate`) and public 0-criteria discount
 * windows (`discountPublicPriceChange`, latest event per discount).
 */
async function loadPriceFacts(
	productId: string,
	target: Currency
): Promise<{ segments: BaseSegment[]; windows: PublicDiscountWindow[] }> {
	const baseLogs = await collections.accountingLogs
		.find({ objectType: 'product', objectId: productId, eventType: 'productPriceUpdate' })
		.sort({ createdAt: 1 })
		.toArray();

	const segments: BaseSegment[] = [];
	for (const log of baseLogs) {
		const after = log.after as { amount?: number; currency?: Currency } | null;
		if (after && typeof after.amount === 'number') {
			// Display in the site's main currency, converted at the current rate.
			segments.push({
				from: log.createdAt.getTime(),
				amount: toCurrency(target, after.amount, after.currency ?? target)
			});
		}
	}

	const discLogs = await collections.accountingLogs
		.find({
			eventType: 'discountPublicPriceChange',
			objectType: 'discount',
			$or: [{ 'after.wholeCatalog': true }, { 'after.productIds': productId }]
		})
		.sort({ createdAt: 1 })
		.toArray();

	const latestByDiscount = new Map<string, (typeof discLogs)[number]>();
	for (const log of discLogs) {
		latestByDiscount.set(log.objectId, log);
	}
	const windows: PublicDiscountWindow[] = [];
	for (const log of latestByDiscount.values()) {
		const after = log.after as {
			percentage?: number;
			beginsAt?: string | Date;
			endsAt?: string | Date | null;
		} | null;
		if (after && typeof after.percentage === 'number' && after.beginsAt) {
			windows.push({
				percentage: after.percentage,
				beginsAt: new Date(after.beginsAt).getTime(),
				endsAt: after.endsAt ? new Date(after.endsAt).getTime() : null
			});
		}
	}

	return { segments, windows };
}

/** Loads real paid sales of a product (effective unit price, in the site currency). */
async function loadPaidSales(productId: string, target: Currency): Promise<PaidSale[]> {
	const orders = await collections.orders
		.find({ 'items.product._id': productId, payments: { $elemMatch: { status: 'paid' } } })
		.toArray();

	const sales: PaidSale[] = [];
	for (const order of orders) {
		const paidPayment = order.payments.find((p) => p.status === 'paid' && p.paidAt);
		const paidAt = paidPayment?.paidAt ?? order.updatedAt;
		if (!paidAt) {
			continue;
		}
		for (const item of order.items) {
			if (item.product?._id !== productId) {
				continue;
			}
			try {
				const from = item.currencySnapshot.main.price.currency;
				sales.push({
					paidAt: paidAt.getTime(),
					unit: toCurrency(target, orderIndividualItemPrice(item, 'main'), from),
					qty: item.quantity ?? 1
				});
			} catch {
				// Item without a main-currency snapshot — skip it.
			}
		}
	}
	return sales;
}

export async function getProductPriceHistory(
	productId: string,
	productCurrency: Currency
): Promise<PriceHistory> {
	const now = Date.now();
	// Everything is displayed in the product's own currency.
	const target = productCurrency;
	const [{ segments, windows }, sales] = await Promise.all([
		loadPriceFacts(productId, target),
		loadPaidSales(productId, target)
	]);

	const digits = FRACTION_DIGITS_PER_CURRENCY[target] ?? 2;
	const catalogue = buildCatalogue(segments, windows, now, digits);
	const paid = buildPaid(sales, catalogue.current, now, digits);

	return { currency: target, catalogue, paid };
}
