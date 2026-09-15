import { collections } from '../database';
import { setTimeout } from 'node:timers/promises';
import { processClosed } from '../process';
import { Lock } from '../lock';
import { inspect } from 'node:util';
import { onOrderPayment, onOrderPaymentFailed } from '../orders';
import { refreshPromise } from '../runtime-config';
import type { Order, Price } from '$lib/types/Order';
import { coversPayment, getProcessor } from '../sdk/pp';

const lock = new Lock('orders');

/**
 * Payment ids already reported as underpaid. The check runs every 2s against a payment
 * that stays pending, so without this the anomaly would fill the logs until it expires.
 */
const underpaymentReported = new Set<string>();

function reportUnderpayment(
	processor: string,
	payment: Order['payments'][number],
	received: Price
): void {
	const key = payment._id.toHexString();
	if (underpaymentReported.has(key)) {
		return;
	}
	underpaymentReported.add(key);
	console.error(
		`[payments] ${processor} reported payment ${key} settled with ${received.amount} ${received.currency}, ` +
			`short of the ${payment.price.amount} ${payment.price.currency} asked. Keeping it pending.`
	);
}

async function handleTapToPayCheck(
	payment: Order['payments'][number],
	order: Order
): Promise<void> {
	try {
		if (!payment.posTapToPay || payment.posTapToPay.expiresAt <= new Date()) {
			return;
		}
		if (!payment.processor) {
			throw new Error('Missing processor for tap-to-pay payment');
		}

		const pp = getProcessor(payment.processor);
		if (!pp?.tapToPay) {
			throw new Error(
				`Tap-to-pay payment ${payment._id} requests processor ` +
					`${payment.processor}, but Tap-to-pay using this processor is not supported.`
			);
		}
		if (!pp.isEnabled()) {
			throw new Error(
				`Tap-to-pay payment ${payment._id} requests processor ${payment.processor} but ` +
					'it is currently not configured.'
			);
		}

		const reference = await pp.tapToPay.findMatching(order, payment._id);
		if (reference) {
			await onOrderPayment(order, payment, payment.price, {
				tapToPay: { expiresAt: new Date(Date.now() + 5000) },
				detail: `${payment.processor} - ${reference}`
			});
		}
	} catch (err) {
		console.error(inspect(err, { depth: 10 }));
	}
}

async function maintainOrders() {
	await refreshPromise;

	while (!processClosed) {
		if (!lock.ownsLock) {
			await setTimeout(5_000);
			continue;
		}
		const pendingOrders = await collections.orders
			.find({
				'payments.status': { $in: ['pending', 'failed'] },
				status: 'pending'
			})
			.toArray()
			.catch((err) => {
				console.error(inspect(err, { depth: 10 }));
				return [];
			});

		for (let order of pendingOrders) {
			for (let payment of order.payments.filter((p) => p.status === 'pending')) {
				// Since we can overwrite order, we need to update payment too if needed
				const updatedPayment = order.payments.find((p) => p._id.equals(payment._id));
				if (!updatedPayment || updatedPayment.status !== 'pending') {
					continue;
				}
				payment = updatedPayment;

				// SDK universal dispatcher — only dispatch if processor AND method match
				// (prevents tap-to-pay method:'point-of-sale' + processor:'stripe' from being caught by PPStripe)
				const pp = payment.processor ? getProcessor(payment.processor) : undefined;
				if (pp && pp.meta.method === payment.method && pp.isEnabled()) {
					try {
						const result = await pp.checkPayment(payment, order);
						switch (result.status) {
							case 'paid':
								// The discriminated result makes `received` mandatory on this arm, so the
								// old "paid without an amount" throw is now unrepresentable rather than caught.
								if (!coversPayment(pp, payment, result.received)) {
									reportUnderpayment(pp.meta.processor, payment, result.received);
									break;
								}
								underpaymentReported.delete(payment._id.toHexString());
								if (result.transactions) {
									payment.transactions = result.transactions;
								}
								order = await onOrderPayment(
									order,
									payment,
									result.received,
									result.fees ? { fees: result.fees } : undefined
								);
								break;
							case 'expired':
								order = await onOrderPaymentFailed(order, payment, 'expired');
								break;
							case 'failed':
								order = await onOrderPaymentFailed(order, payment, 'failed');
								break;
							case 'canceled':
								order = await onOrderPaymentFailed(order, payment, 'canceled');
								break;
							case 'pending':
								if (result.transactions) {
									payment.transactions = result.transactions;
								}
								// Persist the "awaiting confirmation" flag (onchain funds detected
								// but not yet confirmed) so the buyer-facing order page can show it.
								// Only write on change — this loop runs every 2s.
								{
									const awaitingConfirmation = result.awaitingConfirmation ?? false;
									const missingSince = result.mempoolMissingSince ?? null;
									const awaitingChanged =
										(payment.awaitingConfirmation ?? false) !== awaitingConfirmation;
									const missingChanged =
										(payment.mempoolMissingSince?.getTime() ?? null) !==
										(missingSince?.getTime() ?? null);
									if (awaitingChanged || missingChanged) {
										await collections.orders.updateOne(
											{ _id: order._id, 'payments._id': payment._id },
											missingSince
												? {
														$set: {
															'payments.$.awaitingConfirmation': awaitingConfirmation,
															'payments.$.mempoolMissingSince': missingSince
														}
												  }
												: {
														$set: { 'payments.$.awaitingConfirmation': awaitingConfirmation },
														$unset: { 'payments.$.mempoolMissingSince': 1 }
												  }
										);
										payment.awaitingConfirmation = awaitingConfirmation;
										payment.mempoolMissingSince = missingSince ?? undefined;
									}
								}
								break;
							default:
								result satisfies never;
						}
						if (result.status !== 'pending') {
							console.log(
								`SDK: checked payment via ${pp.meta.processor} for order ${order._id}, status: ${result.status}`
							);
						}
						continue;
					} catch (err) {
						console.error(
							`SDK checkPayment error for order ${order._id}, payment ${payment._id}:`,
							err instanceof Error ? err.message : inspect(err, { depth: 10 })
						);
						if (payment.expiresAt && payment.expiresAt < new Date()) {
							order = await onOrderPaymentFailed(order, payment, 'expired');
						}
					}
				}

				// Tap-to-pay: handled outside SDK (matches local state, not external API)
				if (payment.method === 'point-of-sale') {
					await handleTapToPayCheck(payment, order);
				}
			}

			for (const payment of order.payments.filter((p) => p.status === 'failed')) {
				const updatedPayment = order.payments.find((p) => p._id.equals(payment._id));
				if (!updatedPayment || updatedPayment.status !== 'failed') {
					continue;
				}
				if (payment.expiresAt && payment.expiresAt < new Date()) {
					order = await onOrderPaymentFailed(order, payment, 'expired');
				}
			}
		}

		await setTimeout(2_000);
	}
}

maintainOrders();
