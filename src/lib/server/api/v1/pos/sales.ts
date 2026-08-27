import { collections } from '$lib/server/database';
import { ORIGIN } from '$lib/server/env-config';
import { orderIndividualItemPrice, type Order } from '$lib/types/Order';
import type { AuthenticatedApiKey } from '$lib/types/ApiV1';
import type { PosSaleRejection, PosSaleResult, PosSalesResponse } from '$lib/types/ApiV1Pos';
import type { Currency } from '$lib/types/Currency';
import type { OrderWriteCommand } from '../schemas/orders-write';
import { amountToMinor } from '../orders/money';
import { writeBatch } from '../orders/writeBatch';
import type { PosSale } from './schemas';

function sameAmount(a: number, b: number): boolean {
	return Math.abs(a - b) < 1e-9;
}

export function orderUrl(orderId: string): string {
	const base = (ORIGIN ?? '').replace(/\/+$/, '');
	return `${base}/order/${orderId}`;
}

/**
 * Whether a re-pushed sale is the one already ingested under this reference.
 *
 * Equivalence is field by field: amounts compared numerically, `soldAt` as the same instant. Any
 * difference makes the push a `conflict`.
 */
export function posSaleMatchesOrder(sale: PosSale, order: Order): boolean {
	const snapshot = order.currencySnapshot?.main?.totalPrice;
	if (!snapshot) {
		return false;
	}
	if (
		snapshot.currency !== sale.totalPrice.currency ||
		!sameAmount(snapshot.amount, sale.totalPrice.amount)
	) {
		return false;
	}
	if (order.createdAt?.getTime() !== Date.parse(sale.soldAt)) {
		return false;
	}
	if (order.items.length !== sale.items.length) {
		return false;
	}
	return sale.items.every((item, index) => {
		const line = order.items[index];
		if (!line || line.product._id !== item.product || line.quantity !== item.quantity) {
			return false;
		}
		const unit = orderIndividualItemPrice(line, 'main');
		return (
			line.currencySnapshot.main.price.currency === item.price.currency &&
			sameAmount(unit, item.price.amount)
		);
	});
}

/**
 * A sale as an /api/v1 order write command.
 *
 * The unit price travels as `customPrice` so a deferred batch is not repriced by a catalog that
 * moved since the sale.
 */
export function toOrderWriteCommand(sale: PosSale): OrderWriteCommand {
	const currency = sale.totalPrice.currency as Currency;
	return {
		externalOrderId: sale.externalOrderId,
		currency,
		createdAt: sale.soldAt,
		items: sale.items.map((item) => ({
			productId: item.product,
			quantity: item.quantity,
			customPrice: { amountMinor: amountToMinor(item.price.amount, currency), currency }
		})),
		// be-BOP models payment on two levels: `method` for the axis, `posLabel` for the subtype
		// resolved against the shop's configured `posPaymentSubtypes`. The seam flattens both into
		// one field, so its value becomes the subtype.
		payment: {
			method: 'point-of-sale',
			status: 'paid',
			amountMinor: amountToMinor(sale.totalPrice.amount, currency),
			currency,
			posLabel: sale.method
		}
	};
}

/**
 * Whether a refused sale is refused for good.
 *
 * A 4xx the domain raised, or a command the shop's configuration rules out, is the caller's to fix
 * and will be refused identically next time. Anything else — an unreachable database, an unmapped
 * throw — may well succeed on the next attempt and must not be blamed on the caller.
 */
function isPermanentFailure(error?: { code: string; details?: Record<string, unknown> }): boolean {
	if (!error) {
		return false;
	}
	const status = error.details?.httpStatus;
	if (typeof status === 'number') {
		// 408 and 429 are the two 4xx a later attempt can clear on its own.
		return status >= 400 && status < 500 && status !== 408 && status !== 429;
	}
	// The one refusal decided before any write, so the only one carrying no HTTP status.
	return error.code === 'CURRENCY_UNSUPPORTED';
}

/** Either every sale has an outcome, or one was refused and the request fails. */
export type PosIngestResult = { response: PosSalesResponse } | { rejection: PosSaleRejection };

/**
 * Ingest a batch of till sales.
 *
 * A reference already on file is settled from the existing order and never re-written; only new
 * sales reach `writeBatch`.
 */
export async function ingestPosSales(params: {
	apiKey: AuthenticatedApiKey;
	sales: PosSale[];
	clientIp?: string;
}): Promise<PosIngestResult> {
	const { apiKey, sales } = params;

	const known = await collections.orders
		.find({
			externalSourceApiKeyId: apiKey._id,
			externalOrderId: { $in: sales.map((sale) => sale.externalOrderId) }
		})
		.toArray();
	const byRef = new Map<string, Order>();
	for (const doc of known) {
		const order = doc as Order;
		if (order.externalOrderId) {
			byRef.set(order.externalOrderId, order);
		}
	}

	const results = new Map<string, PosSaleResult>();
	const fresh: PosSale[] = [];
	for (const sale of sales) {
		const existing = byRef.get(sale.externalOrderId);
		if (!existing) {
			fresh.push(sale);
			continue;
		}
		results.set(sale.externalOrderId, {
			externalOrderId: sale.externalOrderId,
			status: posSaleMatchesOrder(sale, existing) ? 'success' : 'conflict',
			orderUrl: orderUrl(existing._id)
		});
	}

	if (fresh.length) {
		const written = await writeBatch({
			apiKey,
			orders: fresh.map(toOrderWriteCommand),
			clientIp: params.clientIp
		});
		// writeBatch runs the whole batch whatever happens, so what landed is read from all of its
		// results, not from those preceding the refusal.
		const landed = written.results.filter((result) => result.status !== 'failed' && result.orderId);
		const refused = written.results.find((result) => result.status === 'failed' || !result.orderId);
		if (refused) {
			// Neither seam status can describe a sale that produced no order: both carry an orderUrl.
			// The request fails, and whether the caller can act on it decides how — a refusal the shop
			// would repeat is reported as theirs, so the till stops retrying it.
			if (!isPermanentFailure(refused.error)) {
				throw new Error(
					`Sale ${refused.externalOrderId} could not be ingested: ` +
						(refused.error?.message ?? 'no order produced')
				);
			}
			return {
				rejection: {
					externalOrderId: refused.externalOrderId,
					code: refused.error?.code ?? 'DOMAIN_ERROR',
					message: refused.error?.message ?? 'Sale refused',
					...(refused.error?.details && { details: refused.error.details }),
					ingested: landed.map((result) => result.externalOrderId)
				}
			};
		}
		for (const result of landed) {
			results.set(result.externalOrderId, {
				externalOrderId: result.externalOrderId,
				status: 'success',
				// Guarded by the `refused` check above: every landed result carries an orderId.
				orderUrl: orderUrl(result.orderId as string)
			});
		}
	}

	// Same order as the pushed batch, so the caller can zip the two.
	return {
		response: {
			results: sales.map((sale) => {
				const result = results.get(sale.externalOrderId);
				if (!result) {
					throw new Error(`Sale ${sale.externalOrderId} produced no outcome`);
				}
				return result;
			})
		}
	};
}
