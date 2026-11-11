import { ORIGIN } from '$lib/server/env-config';
import {
	API_V1_DUPLICATE_EXTERNAL_ORDER_ID,
	type ApiV1OrderResult,
	type AuthenticatedApiKey
} from '$lib/types/ApiV1';
import type { PosSaleRejection, PosSaleResult, PosSalesResponse } from '$lib/types/ApiV1Pos';
import type { Currency } from '$lib/types/Currency';
import type { OrderWriteCommand } from '../schemas/orders-write';
import { amountToMinor } from '../orders/money';
import { writeBatch } from '../orders/writeBatch';
import type { PosSale } from './schemas';

export function orderUrl(orderId: string): string {
	const base = (ORIGIN ?? '').replace(/\/+$/, '');
	return `${base}/order/${orderId}`;
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

/** The existing order a write refused as a reference already received, when it names one. */
function duplicateOf(result: ApiV1OrderResult): string | null {
	if (result.status !== 'failed' || result.error?.code !== API_V1_DUPLICATE_EXTERNAL_ORDER_ID) {
		return null;
	}
	const orderId = result.error.details?.orderId;
	return typeof orderId === 'string' ? orderId : null;
}

/**
 * Ingest a batch of till sales, one order per sale.
 *
 * Every sale goes through `writeBatch`, under the API key's rule for external references: by default
 * a reference already received writes nothing and is answered `conflict`, pointing at the order that
 * holds it; a key that accepts several orders per reference gets a new order for every sale.
 */
export async function ingestPosSales(params: {
	apiKey: AuthenticatedApiKey;
	sales: PosSale[];
	clientIp?: string;
}): Promise<PosIngestResult> {
	const { apiKey, sales } = params;

	const written = await writeBatch({
		apiKey,
		orders: sales.map(toOrderWriteCommand),
		clientIp: params.clientIp
	});
	// One result per sale, in the order pushed: two sales may carry the same reference, so results
	// are paired by position, never looked up by reference.
	const outcomes = sales.map((sale, index) => {
		const result = written.results[index];
		if (!result) {
			throw new Error(`Sale ${sale.externalOrderId} produced no outcome`);
		}
		return result;
	});

	// writeBatch runs the whole batch whatever happens, so what landed is read from all of its
	// results, not from those preceding the refusal.
	const landed = outcomes.filter((result) => result.status !== 'failed' && result.orderId);
	const refused = outcomes.find(
		(result) => (result.status === 'failed' || !result.orderId) && !duplicateOf(result)
	);
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

	return {
		response: {
			results: outcomes.map((result): PosSaleResult => {
				const duplicate = duplicateOf(result);
				// Guarded by the `refused` check above: every other result carries an orderId.
				const orderId = duplicate ?? (result.orderId as string);
				return {
					externalOrderId: result.externalOrderId,
					status: duplicate ? 'conflict' : 'success',
					orderId,
					orderUrl: orderUrl(orderId)
				};
			})
		}
	};
}
