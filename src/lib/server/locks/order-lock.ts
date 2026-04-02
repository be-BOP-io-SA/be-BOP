import { collections } from '../database';
import { setTimeout } from 'node:timers/promises';
import { processClosed } from '../process';
import { Lock } from '../lock';
import { inspect } from 'node:util';
import { onOrderPayment, onOrderPaymentFailed } from '../orders';
import { refreshPromise } from '../runtime-config';
import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';
import { isStripeEnabled, lastSuccessfulPaymentIntents } from '../stripe';
import type { Order } from '$lib/types/Order';
import { ObjectId } from 'mongodb';
import { getProcessor } from '../sdk/pp';

const lock = new Lock('orders');

async function findMatchingTapToPayOrderStripe(
	order: Order,
	paymentId: ObjectId
): Promise<string | undefined> {
	const payment = order.payments.find((p) => p._id === paymentId);
	if (!payment) {
		throw new Error(`Payment ${paymentId} or order ${order._id} not found`);
	}
	const tapToPay = payment.posTapToPay;
	if (!tapToPay) {
		return;
	}
	const amountInCurrencyUnit =
		payment.price.amount * Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[payment.price.currency]);
	return lastSuccessfulPaymentIntents().then((pis) => {
		const matchingPaymentIntent = pis.find((pi) => {
			const amountMatches =
				pi.amount_received === amountInCurrencyUnit &&
				pi.currency.toUpperCase() === payment.price.currency;
			const compatibleTimestamp =
				// To account for clock skew, we accept payments to
				// tap-to-pay orders up to 5 seconds before the start time.
				new Date((pi.created + 5) * 1000) > tapToPay.startsAt &&
				// Approximation of the time the payment was completed. This is acceptable
				// because we assume the payment intent is created after tap-to-pay was
				// requested and completed shortly after. To account for clock skew, we
				// accept payments to tap-to-pay orders up to 5 seconds after the end time.
				new Date((pi.created - 5) * 1000) < tapToPay.expiresAt;
			return compatibleTimestamp && amountMatches;
		});
		if (matchingPaymentIntent) {
			return matchingPaymentIntent.id;
		} else {
			return undefined;
		}
	});
}

async function handleTapToPayCheck(
	payment: Order['payments'][number],
	order: Order
): Promise<void> {
	try {
		if (!payment.posTapToPay || payment.posTapToPay.expiresAt <= new Date()) {
			return;
		}
		switch (payment.processor) {
			case 'stripe':
				if (!isStripeEnabled()) {
					throw new Error(
						`Tap-to-pay payment ${payment._id} requests processor stripe but ` +
							'stripe is currently not configured.'
					);
				}
				const matchingPaymentReference = await findMatchingTapToPayOrderStripe(order, payment._id);
				if (matchingPaymentReference) {
					await onOrderPayment(order, payment, payment.price, {
						tapToPay: { expiresAt: new Date(Date.now() + 5000) },
						detail: `${payment.processor} - ${matchingPaymentReference}`
					});
				}
				break;
			case 'btcpay-server':
			case 'paypal':
			case 'phoenixd':
			case 'sumup':
			case 'bitcoind':
			case 'lnd':
			case 'swiss-bitcoin-pay':
			case 'bitcoin-nodeless':
				throw new Error(
					`Tap-to-pay payment ${payment._id} requests processor ` +
						`${payment.processor}, but Tap-to-pay using this processor is ` +
						'not supported.'
				);
			case undefined:
				throw new Error('Missing processor for tap-to-pay payment');
			default:
				payment.processor satisfies never;
				break;
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
								if (!result.received) {
									throw new Error(`SDK: paid without received amount for order ${order._id}`);
								}
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
								break;
							default:
								result.status satisfies never;
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
