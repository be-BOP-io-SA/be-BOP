import type { Order } from '$lib/types/Order';

type SnapshotEntry = Order['currencySnapshot']['main'];
type CurrencyRole = 'main' | 'priceReference' | 'secondary' | 'accounting';

/**
 * Project a monetary field of every configured currency snapshot into a per-currency map
 * (issue #2492) — never the internal SAT unit. `main`/`priceReference` are always in the snapshot;
 * `secondary`/`accounting` only when the shop configured them. A currency is omitted when the
 * field is absent for it (e.g. no discount).
 */
export function orderCurrencyAmounts<T>(
	order: Order,
	pick: (entry: SnapshotEntry) => T | undefined
): Partial<Record<CurrencyRole, T>> {
	const cs = order.currencySnapshot;
	const entries: Array<[CurrencyRole, SnapshotEntry | undefined]> = [
		['main', cs.main],
		['priceReference', cs.priceReference],
		['secondary', cs.secondary],
		['accounting', cs.accounting]
	];
	const out: Partial<Record<CurrencyRole, T>> = {};
	for (const [role, entry] of entries) {
		if (!entry) {
			continue;
		}
		const value = pick(entry);
		if (value !== undefined) {
			out[role] = value;
		}
	}
	return out;
}

/**
 * VAT snapshot for accounting logs (issue #2492): the per-rate breakdown plus the VAT amount in
 * every configured currency. The `rates` breakdown is only reported when matching per-currency
 * amounts exist, so a rate row never appears without its amounts.
 *
 * Pure (Order type only, no DB) so it can be unit-tested without a database.
 */
export function orderVatAccountingSnapshot(order: Order) {
	const amounts = orderCurrencyAmounts(order, (entry) => entry.vat);
	return {
		rates:
			'main' in amounts ? (order.vat ?? []).map(({ rate, country }) => ({ rate, country })) : [],
		...amounts
	};
}
