/**
 * Wire types for `/api/v1/pos`, be-BOP's point-of-sale surface.
 *
 * Separate from `$lib/types/ApiV1` because a till needs different shapes, not because a particular
 * integration asked: whole documents rather than paginated envelopes, since a register syncs its
 * catalog wholesale; and payloads carrying only what a register acts on. Amounts are integers in
 * minor units, as everywhere else in `/api/v1`.
 */

import type { Product } from './Product';

/** A price on the wire: an integer amount in minor units (`1250` in CHF is 12.50 CHF). */
export type PosPrice = {
	amountMinor: number;
	currency: string;
};

/**
 * One paid order, as a `data:` line of the paid-order stream.
 *
 * Delivery is at-least-once; consumers deduplicate on `orderId`, which is also the SSE `id:`.
 *
 * No order is flagged as belonging to a particular integration. An integration that needs to act
 * on some orders and ignore the rest identifies them itself, by the tags their lines carry.
 */
/** A checkout field the buyer filled in, as it reaches an integration. */
export type PosCollectedField = {
	slug: string;
	label: string;
	value?: string;
};

export type PosPaidOrderEvent = {
	orderId: string;
	/**
	 * The reference given when the order was placed through the API. Without it an integration
	 * that credits on payment cannot tell its own orders apart, and credits them twice.
	 */
	externalOrderId?: string;
	/** The custom checkout fields collected on the order. Absent when it carries none. */
	customFields?: PosCollectedField[];
	/**
	 * What was received, VAT included — the whole order, or the tagged line alone when the request
	 * named a tag.
	 */
	amount: PosPrice;
	/**
	 * The variations chosen on the tagged line, when the request named a tag and the line has some.
	 * This is how a support reaches the integration that credits it: the identifier its link set
	 * (`?key=…`, #2688) is one of them.
	 */
	chosenVariations?: Record<string, string>;
	/**
	 * The VAT contained in `amount`, one entry per rate. Absent when the order carries no VAT.
	 *
	 * Snapshotted on the order at payment time, not recomputed: a rate that changed since is not
	 * the rate that was charged, and #2695 signs these figures into an append-only chain.
	 */
	vat?: Array<{ rate: number; amountMinor: number }>;
};

/** Mirrors be-BOP `ImageData`. Links point at be-BOP, never at object storage, and do not expire. */
export type PosImageData = {
	/** The lowest resolution — what to render by default. */
	url: string;
	width: number;
	height: number;
	/** Every size generated for this picture, smallest first. `url` is the first of these. */
	formats: Array<{ url: string; width: number; height: number }>;
};

/**
 * A catalog entry.
 *
 * No price: the till sends `PosSaleItem.price` at sale time, so it holds its own.
 *
 * `tagIds` is an addition to the seam. The seam's `returnable: { productSlug, policy }` is not
 * emitted: returnables are flagged by tag.
 */
export type PosCatalogProduct = {
	slug: string;
	name: string;
	shortDescription: string;
	picture?: PosImageData;
	tagIds: string[];
	/**
	 * VAT rate as a percentage, resolved against the shop's country — a register sells on the
	 * premises, so the buyer's country never enters.
	 */
	vatRate: number;
	/** Display names of the variation families (`names`) and of their values (`values`). */
	variationLabels?: Product['variationLabels'];
	/**
	 * The variations the product offers, one entry per value of each family. No price, as for the
	 * product itself: the till sends what it charged. Absent when the product has none.
	 */
	variations?: Array<{ name: string; value: string }>;
};

/** Resolves a `tagIds` entry to something displayable. `family` is be-BOP's tag grouping. */
export type PosCatalogTag = {
	id: string;
	name: string;
	family?: string;
};

/** `GET /api/v1/pos/products` — the catalog and the tags its products reference. */
export type PosCatalogResponse = {
	products: PosCatalogProduct[];
	tags: PosCatalogTag[];
};

export const POS_SALE_STATUSES = ['success', 'conflict'] as const;
export type PosSaleStatus = (typeof POS_SALE_STATUSES)[number];

/**
 * Outcome of one pushed sale.
 *
 * `success`: an order was created for this sale.
 * `conflict`: the reference was already received from this API key. Nothing was written, and
 * `orderUrl` points at the order that holds the reference. A key that accepts several orders with
 * the same external id never gets one: each of its sales is written as its own order.
 *
 * A sale that produced no order has neither status: both require an `orderUrl`. It fails the whole
 * request instead, as a `PosSaleRejection` when the shop refused it and as a 500 otherwise.
 */
export type PosSaleResult = {
	externalOrderId: string;
	status: PosSaleStatus;
	/** The order this sale produced. Given plainly so a caller never has to parse `orderUrl`. */
	orderId: string;
	orderUrl: string;
};

export type PosSalesResponse = { results: PosSaleResult[] };

/**
 * A sale the shop refused for a reason a retry will not change.
 *
 * Reported as a 400 so the till stops resending. The distinction matters on a seam that retries by
 * design: a refused currency or an unknown product would otherwise loop forever behind a 500.
 */
export type PosSaleRejection = {
	/** The refused sale. The rest of the batch is described by `ingested`. */
	externalOrderId: string;
	/** The domain code behind the refusal — `CURRENCY_UNSUPPORTED`, `STOCK_UNAVAILABLE`, … */
	code: string;
	message: string;
	details?: Record<string, unknown>;
	/**
	 * References of the same batch that did land before the request failed. They are on file; the
	 * caller re-pushes the corrected batch whole, and these come back as `conflict`, written once.
	 */
	ingested: string[];
};
