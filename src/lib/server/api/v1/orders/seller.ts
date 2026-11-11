/**
 * Seller shown on anything the API writes on an order.
 *
 * The admin order list reads the seller from `user.userAlias` and labels a missing one "System" —
 * the same word it uses for a storefront order nobody sold. Without this, an integrator's sales are
 * indistinguishable from the shop's own, in the listing as in its seller filter.
 *
 * It lives in its own module because the read path needs it too, and importing it from `writeOne`
 * would drag the whole ordering domain into a DTO.
 */
export const API_ORDER_SELLER_ALIAS = 'externalPartner';

/**
 * Role recorded on a note an API key writes. It is no role of the shop and grants nothing: it only
 * keeps the note apart from the buyer's and from be-BOP's own, so the order pages list it with the
 * staff notes, under the alias below.
 */
export const API_NOTE_ROLE = 'api-key';

/** Author shown on a note an API key writes: "API - " and the key's name, e.g. "API - Front desk". */
export function apiNoteAlias(keyName: string): string {
	return `API - ${keyName}`;
}
