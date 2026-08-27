import { z } from 'zod';
import { CURRENCIES } from '$lib/types/Currency';

/**
 * be-BOP `Price` on the wire: major units, no storage `precision`.
 *
 * Every be-BOP currency is accepted; an integration contract that pins a single one is a subset.
 */
const posPriceSchema = z
	.object({
		amount: z.number().positive('amount must be > 0'),
		currency: z.enum(CURRENCIES)
	})
	.strict();

const posSaleItemSchema = z
	.object({
		/** Catalog product slug — a be-BOP product `_id`. */
		product: z.string().trim().min(1).max(200),
		quantity: z.number().int().positive().max(1_000_000),
		/** Unit price at sale time. */
		price: posPriceSchema
	})
	.strict();

/**
 * How far ahead a `soldAt` may sit before it is refused. The past is unbounded.
 *
 * Wide enough to absorb any timezone misconfiguration — a till sending local time as if it were
 * UTC is off by at most 14 hours, the largest offset in use — and any daylight-saving shift. It is
 * deliberately wider than clock drift, which is minutes.
 *
 * The cost of that width: 24 hours is enough to cross one day boundary, so a genuinely wrong date
 * can still land in the wrong Z-ticket. Tightening this is a one-line change.
 */
const SOLD_AT_MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

const posSaleSchema = z
	.object({
		/** Minted by the caller. Never be-BOP's order `_id`. */
		externalOrderId: z.string().trim().min(1).max(200),
		items: z.array(posSaleItemSchema).min(1).max(500),
		totalPrice: posPriceSchema,
		/**
		 * Slug of the PoS payment subtype the shop configured, resolved against
		 * `posPaymentSubtypes`. be-BOP splits payment into an axis — always `point-of-sale` for a
		 * till — and this subtype; an integration names its own.
		 */
		method: z.string().trim().min(1).max(200),
		/**
		 * When the sale happened at the till, not when it was ingested. RFC 3339 with offset, so the
		 * instant is unambiguous whatever the till's timezone.
		 *
		 * Bounded on the future only. Reporting and VAT day boundaries follow this value, and #2695
		 * makes it worse than a reporting error: the Z-ticket carries perpetual per-rate totals in a
		 * signed, append-only chain, so a sale filed under the wrong day cannot be corrected, only
		 * appended to. A sale in the future is always a bug; a sale in the past is a late batch,
		 * which is exactly what a till that lost its link is expected to produce.
		 */
		soldAt: z.string().datetime({ offset: true })
	})
	.strict()
	.superRefine((sale, ctx) => {
		const soldAt = Date.parse(sale.soldAt);
		if (!Number.isNaN(soldAt) && soldAt - Date.now() > SOLD_AT_MAX_FUTURE_MS) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'soldAt must not be more than 24 hours in the future',
				path: ['soldAt']
			});
		}
		sale.items.forEach((item, index) => {
			if (item.price.currency !== sale.totalPrice.currency) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'items[].price.currency must equal totalPrice.currency',
					path: ['items', index, 'price', 'currency']
				});
			}
		});
	});

/** `POST /api/v1/pos/orders` body: a bare array of sales. */
export const posSalesRequestSchema = z.array(posSaleSchema).min(1).max(100);

export type PosSale = z.infer<typeof posSaleSchema>;
export type PosSaleItem = z.infer<typeof posSaleItemSchema>;
