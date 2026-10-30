import { orderIndividualItemPrice, type Order } from '$lib/types/Order';

/**
 * The one line of an order whose product carries a given tag.
 *
 * An integration acts on some orders and ignores the rest — a top-up system on top-ups, a locker on
 * rentals — and says which by naming the tag it means. be-BOP holds no domain word of its own.
 *
 * Tags are read from the product snapshot the order carries, not from the catalog as it stands now:
 * a product tagged after the sale was not that kind of product when it was sold.
 */
export type TaggedLine = {
	/** What was charged for the line, VAT included, in major units. */
	amount: number;
	currency: string;
	/** The VAT contained in `amount`, at the line's own rate. Null when the line carries none. */
	vat: { rate: number; amount: number } | null;
	/** The storefront `?key=` the line carried, when it had one — see #2688. */
	key?: string;
};

/**
 * `null` when no line carries the tag, `'ambiguous'` when more than one does.
 *
 * Ambiguity is refused rather than resolved: choosing between two matching lines would credit an
 * arbitrary one, and there is no correct arbitrary choice. By the time a feed sees the order it is
 * already paid, so refusing here can only mean staying silent and logging — the guard that would
 * prevent the situation belongs at the cart, before the money moves.
 */
export function findTaggedLine(order: Order, tag: string): TaggedLine | null | 'ambiguous' {
	const matches = order.items.filter((item) => item.product?.tagIds?.includes(tag));
	if (!matches.length) {
		return null;
	}
	if (matches.length > 1) {
		return 'ambiguous';
	}

	const line = matches[0];
	const snapshot = line.currencySnapshot?.main;
	if (!snapshot) {
		return null;
	}
	// Units actually charged: a line can give some away (PoS offer) without charging for them.
	const chargedQuantity = Math.max(0, line.quantity - (line.freeQuantity ?? 0));
	const excludingVat = orderIndividualItemPrice(line, 'main') * chargedQuantity;
	const rate = line.vatRate ?? 0;
	const vatAmount = excludingVat * (rate / 100);

	return {
		amount: excludingVat + vatAmount,
		currency: snapshot.price.currency,
		vat: rate ? { rate, amount: vatAmount } : null,
		...(line.uniqueKey && { key: line.uniqueKey })
	};
}
