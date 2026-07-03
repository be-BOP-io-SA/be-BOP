import type { Order } from '$lib/types/Order';

/**
 * VAT snapshot for accounting logs (issue #2492): the per-rate breakdown plus the amounts in every
 * configured currency — never the internal SAT unit. `main`/`priceReference` are always present;
 * `secondary`/`accounting` only when the shop configured them.
 *
 * Pure (Order type only, no DB) so it can be unit-tested without a database.
 */
export function orderVatAccountingSnapshot(order: Order) {
	const cs = order.currencySnapshot;
	return {
		rates: (order.vat ?? []).map(({ rate, country }) => ({ rate, country })),
		main: cs.main.vat,
		priceReference: cs.priceReference.vat,
		...(cs.secondary?.vat && { secondary: cs.secondary.vat }),
		...(cs.accounting?.vat && { accounting: cs.accounting.vat })
	};
}
