/**
 * Wire types for `/api/v1/pos`, be-BOP's point-of-sale surface.
 *
 * Separate from `$lib/types/ApiV1` because a till needs different shapes, not because a particular
 * integration asked: whole documents rather than paginated envelopes, since a register syncs its
 * catalog wholesale; be-BOP `Price` in major units, since a register displays amounts rather than
 * computing on them; and payloads carrying only what a register acts on.
 */

/** be-BOP `Price` on the wire, without the storage `precision` field. Major units. */
export type PosPrice = {
	amount: number;
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
export type PosPaidOrderEvent = {
	orderId: string;
	/**
	 * What was received, VAT included — the whole order, or the tagged line alone when the request
	 * named a tag.
	 */
	amount: PosPrice;
	/**
	 * The storefront `?key=` the tagged line carried, when the request named a tag and the line had
	 * one. This is how a support scanned at the counter reaches the integration that credits it.
	 */
	key?: string;
	/**
	 * The VAT contained in `amount`, one entry per rate. Absent when the order carries no VAT.
	 *
	 * Snapshotted on the order at payment time, not recomputed: a rate that changed since is not
	 * the rate that was charged, and #2695 signs these figures into an append-only chain.
	 */
	vat?: Array<{ rate: number; amount: number }>;
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
 * `success`: an order was created, or an equivalent one already existed under this reference.
 * `conflict`: the reference was already ingested by a *different* order, and `orderUrl` points at it.
 *
 * A sale that produced no order has neither status: both require an `orderUrl`. It fails the whole
 * request instead, as a `PosSaleRejection` when the shop refused it and as a 500 otherwise.
 */
export type PosSaleResult = {
	externalOrderId: string;
	status: PosSaleStatus;
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
	 * caller re-pushes the corrected batch whole, and reference idempotency makes these a no-op.
	 */
	ingested: string[];
};
