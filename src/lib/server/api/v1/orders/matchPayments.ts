import type { Order, OrderPayment } from '$lib/types/Order';
import type { OrderPaymentWrite } from '$lib/server/api/v1/schemas/orders-write';
import { amountToMinor } from './money';

/**
 * Match payload payments → order.payments for create settle / duplicate sync.
 *
 * Priority:
 * 1. externalPaymentId when present on both sides (unused order row only)
 * 2. unused order payment with same (amountMinor + currency + method)
 * 3. same index if that order payment is still unused — only when the payload
 *    has no externalPaymentId (legacy / mono). An explicit id that did not match
 *    must not steal another row by index.
 *
 * Never maps two payload payments onto the same order payment.
 * Unmatched payload payment with a truly new externalPaymentId may be added by
 * the caller when order is pending and remaining amount allows; otherwise skipped.
 */
export type PaymentMatch = { kind: 'existing'; orderPaymentIndex: number } | { kind: 'unmatched' };

export function matchPayloadPayment(
	orderPayments: OrderPayment[],
	payload: OrderPaymentWrite,
	payloadIndex: number,
	usedOrderIndexes: ReadonlySet<number>
): PaymentMatch {
	if (payload.externalPaymentId) {
		const byId = orderPayments.findIndex(
			(op, j) => !usedOrderIndexes.has(j) && op.externalPaymentId === payload.externalPaymentId
		);
		if (byId >= 0) {
			return { kind: 'existing', orderPaymentIndex: byId };
		}
	}

	const byAmountMethod = orderPayments.findIndex((op, j) => {
		if (usedOrderIndexes.has(j)) {
			return false;
		}
		if (op.method !== payload.method) {
			return false;
		}
		if (op.price.currency !== payload.currency) {
			return false;
		}
		return amountToMinor(op.price.amount, op.price.currency) === payload.amountMinor;
	});
	if (byAmountMethod >= 0) {
		return { kind: 'existing', orderPaymentIndex: byAmountMethod };
	}

	// Index fallback is for legacy payloads without a stable id only.
	if (
		!payload.externalPaymentId &&
		payloadIndex < orderPayments.length &&
		!usedOrderIndexes.has(payloadIndex)
	) {
		return { kind: 'existing', orderPaymentIndex: payloadIndex };
	}

	return { kind: 'unmatched' };
}

/** True when a duplicate sync may append this unmatched payload payment (admin-style). */
export function shouldAddUnmatchedPayment(
	order: Pick<Order, 'status'> & { payments: Pick<OrderPayment, 'externalPaymentId'>[] },
	payload: OrderPaymentWrite,
	remainingMainAmount: number
): boolean {
	if (!payload.externalPaymentId || order.status !== 'pending' || remainingMainAmount <= 0) {
		return false;
	}
	// Only add when the id is truly new on the order (not an already-claimed duplicate id).
	const alreadyPresent = order.payments.some(
		(op) => op.externalPaymentId === payload.externalPaymentId
	);
	return !alreadyPresent;
}
