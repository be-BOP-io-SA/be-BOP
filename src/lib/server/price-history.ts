import { subDays, startOfDay } from 'date-fns';
import { collections } from './database';
import { runtimeConfig } from './runtime-config';
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
	/**
	 * Currency the paid tab is expressed in: the accounting currency (or the main currency when
	 * no accounting currency is configured). Everything here comes from the orders' own
	 * currency snapshots, so no exchange rate is ever fabricated.
	 */
	currency: Currency;
	/** One point per day with at least one paid sale (quantity-weighted effective unit price). */
	points: PricePoint[];
	/**
	 * Catalogue/list price as snapshotted on each sale (quantity-weighted per day). Drawn as the
	 * comparison overlay on the paid tab — a real snapshot, unlike the product-currency catalogue
	 * on the history tab which cannot be converted historically.
	 */
	listPoints: PricePoint[];
	/** Quantity-weighted mean effective unit price over the rolling 30-day window. */
	mean: number | null;
	/** How far the mean sits below the snapshotted list price, in percent. */
	pctBelowCatalogue: number | null;
}

/** {@link buildPaid} output before the currency label is attached by {@link getProductPriceHistory}. */
export type PaidSeries = Omit<PaidHistory, 'currency'>;

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
	/** Effective unit price actually paid (incl. custom price + discount), in the paid currency. */
	effUnit: number;
	/** Catalogue/list unit price as snapshotted at sale time, in the paid currency. */
	listUnit: number;
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
	priceDigits = 2,
	sinceMs: number | null = null
): CatalogueHistory {
	if (!segments.length) {
		return { points: [], current: null, deltaPct: null, min30: null, max30: null };
	}

	const firstAt = segments.reduce((min, s) => Math.min(min, s.from), segments[0].from);
	const windowStart30 = subDays(new Date(now), 30).getTime();

	// Collect only the timestamps where the effective price can change — segment
	// boundaries and discount window edges — instead of sampling every day.
	const changeTs = new Set<number>();
	for (const s of segments) {
		changeTs.add(s.from);
	}
	for (const w of windows) {
		changeTs.add(w.beginsAt);
		if (w.endsAt !== null) {
			changeTs.add(w.endsAt);
		}
	}
	const sorted = [...changeTs].filter((t) => t >= firstAt && t < now).sort((a, b) => a - b);

	const allPoints: PricePoint[] = [];
	let prev: number | null = null;
	for (const t of sorted) {
		const price = catalogueValueAt(segments, windows, t, priceDigits);
		if (price !== null && price !== prev) {
			allPoints.push({ t: new Date(t).toISOString(), price });
			prev = price;
		}
	}
	const current = catalogueValueAt(segments, windows, now, priceDigits);
	if (current !== null) {
		allPoints.push({ t: new Date(now).toISOString(), price: current });
	}

	let deltaPct: number | null = null;
	const distinct = allPoints.filter((p, i, arr) => i === 0 || p.price !== arr[i - 1].price);
	if (distinct.length >= 2 && current !== null) {
		const prevPrice = distinct[distinct.length - 2].price;
		if (prevPrice) {
			deltaPct = round2(((current - prevPrice) / prevPrice) * 100);
		}
	}

	let min30: CatalogueHistory['min30'] = null;
	let max30: CatalogueHistory['max30'] = null;
	const kpiTs = [...new Set([windowStart30, ...changeTs, now])]
		.filter((t) => t >= Math.max(windowStart30, firstAt) && t <= now)
		.sort((a, b) => a - b);
	for (const t of kpiTs) {
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

	// Bound the returned series to the requested window (KPIs above stay full-history),
	// anchored at the window edge so the line starts with the price in effect then.
	let points = allPoints;
	if (sinceMs !== null) {
		const within = allPoints.filter((p) => Date.parse(p.t) >= sinceMs);
		const anchor = catalogueValueAt(segments, windows, sinceMs, priceDigits);
		points =
			anchor !== null && (within.length === 0 || Date.parse(within[0].t) > sinceMs)
				? [{ t: new Date(sinceMs).toISOString(), price: anchor }, ...within]
				: within;
	}

	return { points, current, deltaPct, min30, max30 };
}

/**
 * Build the daily average-paid series, the snapshotted list-price overlay, and KPIs from real
 * paid sales. Both the effective price and the list price come from the same order snapshots,
 * so the "% below catalogue" compares like with like (no exchange rate is fabricated).
 */
export function buildPaid(sales: PaidSale[], now: number, priceDigits = 2): PaidSeries {
	const windowStart = subDays(new Date(now), 30).getTime();
	const dayBuckets = new Map<string, { effSum: number; listSum: number; qty: number }>();
	let effWindowSum = 0;
	let listWindowSum = 0;
	let windowQty = 0;

	for (const sale of sales) {
		const key = startOfDay(new Date(sale.paidAt)).toISOString();
		const bucket = dayBuckets.get(key) ?? { effSum: 0, listSum: 0, qty: 0 };
		bucket.effSum += sale.effUnit * sale.qty;
		bucket.listSum += sale.listUnit * sale.qty;
		bucket.qty += sale.qty;
		dayBuckets.set(key, bucket);
		if (sale.paidAt >= windowStart) {
			effWindowSum += sale.effUnit * sale.qty;
			listWindowSum += sale.listUnit * sale.qty;
			windowQty += sale.qty;
		}
	}

	const sorted = [...dayBuckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
	const points: PricePoint[] = sorted.map(([t, b]) => ({ t, price: round(b.effSum / b.qty, priceDigits) }));
	const listPoints: PricePoint[] = sorted.map(([t, b]) => ({
		t,
		price: round(b.listSum / b.qty, priceDigits)
	}));

	const mean = windowQty > 0 ? round(effWindowSum / windowQty, priceDigits) : null;
	const meanList = windowQty > 0 ? round(listWindowSum / windowQty, priceDigits) : null;
	const pctBelowCatalogue =
		mean !== null && meanList ? round2((1 - mean / meanList) * 100) : null;

	return { points, listPoints, mean, pctBelowCatalogue };
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

	// Group events by discount id (already sorted by createdAt from DB).
	// Each edit creates a new event; build one window per version, clipped to
	// that version's validity period so edits don't overwrite prior history.
	const eventsByDiscount = new Map<string, typeof discLogs>();
	for (const log of discLogs) {
		const group = eventsByDiscount.get(log.objectId) ?? [];
		group.push(log);
		eventsByDiscount.set(log.objectId, group);
	}
	const windows: PublicDiscountWindow[] = [];
	for (const events of eventsByDiscount.values()) {
		for (let i = 0; i < events.length; i++) {
			const log = events[i];
			const nextLog = events[i + 1];
			const after = log.after as {
				percentage?: number;
				beginsAt?: string | Date;
				endsAt?: string | Date | null;
			} | null;
			if (!after || typeof after.percentage !== 'number' || !after.beginsAt) {
				continue;
			}
			const editedAt = log.createdAt.getTime();
			const nextEditAt = nextLog ? nextLog.createdAt.getTime() : null;
			const scheduledBegins = new Date(after.beginsAt).getTime();
			const scheduledEnds = after.endsAt ? new Date(after.endsAt).getTime() : null;
			// Clip the discount's scheduled window to this event's validity period.
			const effectiveBegins = Math.max(editedAt, scheduledBegins);
			const effectiveEnds =
				nextEditAt !== null
					? scheduledEnds !== null
						? Math.min(nextEditAt, scheduledEnds)
						: nextEditAt
					: scheduledEnds;
			if (effectiveEnds !== null && effectiveEnds <= effectiveBegins) {
				continue;
			}
			windows.push({
				percentage: after.percentage,
				beginsAt: effectiveBegins,
				endsAt: effectiveEnds
			});
		}
	}

	return { segments, windows };
}

/**
 * Loads real paid sales of a product from the orders' currency snapshots, in the paid currency
 * (accounting when configured, otherwise main). Reads the effective price and the catalogue/list
 * price straight from the snapshot the order captured at sale time — no exchange rate is applied,
 * so the paid tab never fabricates a BTC→EUR conversion the way a current-rate view would.
 */
async function loadPaidSales(
	productId: string,
	target: Currency,
	useAccounting: boolean,
	since: Date | null
): Promise<PaidSale[]> {
	// Bound the query to the requested window so a popular product never loads its
	// entire paid-order history. Project only what the computation needs.
	const paidMatch = since ? { status: 'paid', paidAt: { $gte: since } } : { status: 'paid' };
	const sinceMs = since ? since.getTime() : null;
	const orders = await collections.orders
		.find(
			{ 'items.product._id': productId, payments: { $elemMatch: paidMatch } },
			{
				projection: {
					'items.product._id': 1,
					'items.quantity': 1,
					'items.discountPercentage': 1,
					'items.currencySnapshot.main': 1,
					'items.currencySnapshot.accounting': 1,
					'payments.status': 1,
					'payments.paidAt': 1,
					updatedAt: 1
				}
			}
		)
		.toArray();

	const snapKey = useAccounting ? 'accounting' : 'main';
	const sales: PaidSale[] = [];
	for (const order of orders) {
		const paidPayment = order.payments.find((p) => p.status === 'paid' && p.paidAt);
		const paidAt = paidPayment?.paidAt ?? order.updatedAt;
		if (!paidAt || (sinceMs !== null && paidAt.getTime() < sinceMs)) {
			continue;
		}
		for (const item of order.items) {
			if (item.product?._id !== productId) {
				continue;
			}
			// Skip items without a snapshot faithfully denominated in the paid currency (e.g. orders
			// predating the accounting currency). Including them would mix currencies on one axis.
			const snapshot = item.currencySnapshot[snapKey];
			if (!snapshot || snapshot.price.currency !== target) {
				continue;
			}
			try {
				sales.push({
					paidAt: paidAt.getTime(),
					effUnit: orderIndividualItemPrice(item, snapKey),
					listUnit: snapshot.price.amount,
					qty: item.quantity ?? 1
				});
			} catch {
				// Malformed snapshot — skip it.
			}
		}
	}
	return sales;
}

export async function getProductPriceHistory(
	productId: string,
	productCurrency: Currency,
	windowDays: number | null = null
): Promise<PriceHistory> {
	const now = Date.now();
	// Catalogue (history tab): the product's own currency, as defined & saved in the price logs.
	// Paid tab: the accounting currency (or main when none is configured — the standard
	// `accounting ?? main` fallback), taken from order snapshots so nothing is FX-converted.
	const paidCurrency = runtimeConfig.accountingCurrency ?? runtimeConfig.mainCurrency;
	const useAccounting = runtimeConfig.accountingCurrency !== null;
	// Bound the (heavy) paid-orders query to the requested window; null = all history.
	const since = windowDays && windowDays > 0 ? subDays(new Date(now), windowDays) : null;
	const [{ segments, windows }, sales] = await Promise.all([
		loadPriceFacts(productId, productCurrency),
		loadPaidSales(productId, paidCurrency, useAccounting, since)
	]);

	const catDigits = FRACTION_DIGITS_PER_CURRENCY[productCurrency] ?? 2;
	const catalogue = buildCatalogue(
		segments,
		windows,
		now,
		catDigits,
		since ? since.getTime() : null
	);
	const paidDigits = FRACTION_DIGITS_PER_CURRENCY[paidCurrency] ?? 2;
	const paid: PaidHistory = { currency: paidCurrency, ...buildPaid(sales, now, paidDigits) };

	return { currency: productCurrency, catalogue, paid };
}
