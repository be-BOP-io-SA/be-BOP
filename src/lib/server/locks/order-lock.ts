import { collections } from '../database';
import { setTimeout } from 'node:timers/promises';
import { processClosed } from '../process';
import { listTransactions, orderAddressLabel } from '../bitcoind';
import { sum } from '$lib/utils/sum';
import { Lock } from '../lock';
import { inspect } from 'node:util';
import { lndLookupInvoice } from '../lnd';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { onOrderPayment, onOrderPaymentFailed, PaymentFailureProcessingOptions } from '../orders';
import { refreshPromise, runtimeConfig, runtimeConfigUpdatedAt } from '../runtime-config';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
import { btcpayGetLnInvoice } from '../btcpay-server';
import { phoenixdLookupInvoice } from '../phoenixd';
import { sbpGetCheckoutStatus } from '../swiss-bitcoin-pay';
import {
	CURRENCIES,
	CURRENCY_UNIT,
	Currency,
	FRACTION_DIGITS_PER_CURRENCY
} from '$lib/types/Currency';
import { typedInclude } from '$lib/utils/typedIncludes';
import { isPaypalEnabled, paypalGetCheckoutAndCapture } from '../paypal';
import { isStripeEnabled } from '../stripe';
import { differenceInMinutes } from 'date-fns';
import { z } from 'zod';
import { getSatoshiReceivedNodeless } from '../bitcoin-nodeless';
import { trimSuffix } from '$lib/utils/trimSuffix';
import { Order, OrderPayment } from '$lib/types/Order';
import { ObjectId, WithId } from 'mongodb';
import { lastSuccessfulPaymentIntents } from '../stripe';
import { subsumGetCheckout } from '../sumup';

const lock = new Lock('orders');

function asCurrencyOrThrow(value: string): Currency {
	if (!typedInclude(CURRENCIES, value)) {
		throw new Error(`Invalid currency: ${value}`);
	}
	return value;
}

/**
 * Returns a possibly updated order, after processing any possible updates to the payment.
 */
async function processCardPaymentSumup(
	order: WithId<Order>,
	payment: OrderPayment
): Promise<Order> {
	if (!payment.checkoutId) {
		throw new Error('Missing checkout ID on card order');
	}
	const checkout = await subsumGetCheckout(payment.checkoutId);
	if (checkout.status === 'PAID') {
		payment.transactions = (checkout.transactions ?? [])
			// tx contains more information, but we store it opaquely.
			.map((tx) => ({ ...tx, currency: asCurrencyOrThrow(tx.currency) }));
		return onOrderPayment(order, payment, {
			amount: checkout.amount,
			currency: asCurrencyOrThrow(checkout.currency)
		});
	} else if (checkout.status === 'FAILED') {
		const opts: PaymentFailureProcessingOptions = {
			processorDenialMessage: checkout.reason?.description
		};
		return onOrderPaymentFailed(order, payment, 'failed', opts);
	} else if (payment.expiresAt && payment.expiresAt < new Date()) {
		return onOrderPaymentFailed(order, payment, 'expired');
	} else {
		return order;
	}
}

async function processCardPaymentStripe(
	order: WithId<Order>,
	payment: OrderPayment
): Promise<Order> {
	if (!runtimeConfig.stripe.secretKey) {
		throw new Error('Missing stripe secret key');
	}
	const paymentId = payment.checkoutId;
	if (!paymentId) {
		throw new Error('Missing checkout id on stripe order');
	}
	const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentId}`, {
		headers: {
			Authorization: 'Bearer ' + runtimeConfig.stripe.secretKey
		}
	});
	if (!response.ok) {
		throw new Error(
			`Failed to fetch payment intent status for order ${order._id} with ` +
				`payment intent ${paymentId}`
		);
	}
	const paymentIntent: {
		status: string;
		amount_received: number;
		last_payment_error?: {
			advice_code?: string;
			message?: string;
		};
		currency: string;
	} = await response.json();
	if (paymentIntent.status === 'succeeded') {
		const currency = paymentIntent.currency.toUpperCase();
		if (!typedInclude(CURRENCIES, currency)) {
			throw new Error(`Payment intent is in unknown currency ${currency}`);
		}
		return onOrderPayment(order, payment, {
			amount: paymentIntent.amount_received * CURRENCY_UNIT[currency],
			currency: currency
		});
	} else if (paymentIntent.status === 'canceled') {
		const opts: PaymentFailureProcessingOptions = {};
		if (paymentIntent.last_payment_error) {
			const { advice_code, message } = paymentIntent.last_payment_error;
			if (message) {
				opts.processorDenialMessage = message;
			} else if (advice_code) {
				opts.processorDenialMessage = `the network issued the following advice: ${advice_code}`;
			}
		}
		return onOrderPaymentFailed(order, payment, 'failed', opts);
	} else if (payment.expiresAt && new Date() > payment.expiresAt) {
		const cancelResponse = await fetch(
			`https://api.stripe.com/v1/payment_intents/${paymentId}/cancel`,
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + runtimeConfig.stripe.secretKey
				}
			}
		);
		if (!cancelResponse.ok) {
			throw new Error(`Failed to cancel payment intent ${paymentId} for order ${order._id}`);
		}
		return onOrderPaymentFailed(order, payment, 'expired');
	} else {
		return order;
	}
}

async function processCardPaymentPaypal(
	order: WithId<Order>,
	payment: OrderPayment
): Promise<Order> {
	if (!isPaypalEnabled()) {
		throw new Error('Missing PayPal credentials');
	}
	if (!payment.checkoutId) {
		throw new Error('Missing checkout ID on PayPal order');
	}
	const checkout = await paypalGetCheckoutAndCapture(payment.checkoutId);
	if (checkout.status === 'COMPLETED') {
		return onOrderPayment(order, payment, {
			amount: Number(checkout.purchase_units[0].amount.value),
			currency: checkout.purchase_units[0].amount.currency_code
		});
	} else if (checkout.status === 'FAILED') {
		const opts: PaymentFailureProcessingOptions = {
			processorDenialMessage: checkout.capture_error
		};
		return onOrderPaymentFailed(order, payment, 'failed', opts);
	} else if (payment.expiresAt && payment.expiresAt < new Date()) {
		return onOrderPaymentFailed(order, payment, 'expired');
	} else if (checkout.status === 'VOIDED') {
		return onOrderPaymentFailed(order, payment, 'failed');
	} else {
		return order;
	}
}

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
				switch (payment.method) {
					case 'bitcoin':
						try {
							let satReceived = 0;
							if (payment.processor === 'bitcoin-nodeless') {
								if (
									!runtimeConfigUpdatedAt['bitcoinBlockHeight'] ||
									differenceInMinutes(new Date(), runtimeConfigUpdatedAt['bitcoinBlockHeight']) >= 1
								) {
									const resp = await fetch(
										new URL(
											trimSuffix(runtimeConfig.bitcoinNodeless.mempoolUrl, '/') +
												'/api/blocks/tip/height'
										)
									);

									if (!resp.ok) {
										throw new Error('Failed to fetch block height');
									}

									const blockHeight = z.number().parse(await resp.json());

									if (runtimeConfig.bitcoinBlockHeight !== blockHeight) {
										console.log('Updating bitcoin block height to', blockHeight);
										runtimeConfig.bitcoinBlockHeight = blockHeight;
										runtimeConfigUpdatedAt['bitcoinBlockHeight'] = new Date();

										await collections.runtimeConfig.updateOne(
											{
												_id: 'bitcoinBlockHeight'
											},
											{
												$set: {
													data: blockHeight,
													updatedAt: new Date()
												}
											},
											{
												upsert: true
											}
										);
									}
								}

								if (!payment.address) {
									throw new Error('Missing address on bitcoin order');
								}

								const nConfirmations = getConfirmationBlocks(payment.price);

								const received = await getSatoshiReceivedNodeless(payment.address, nConfirmations);

								payment.transactions = received.transactions;
								satReceived = received.satReceived;

								if (satReceived) {
									console.log(
										'Received',
										satReceived,
										'SAT for order',
										order._id,
										nConfirmations,
										'out of',
										toSatoshis(payment.price.amount, payment.price.currency)
									);
								}
							} else {
								const transactions = await listTransactions(
									orderAddressLabel(order._id, payment._id)
								);

								const confirmationBlocks = getConfirmationBlocks(payment.price);

								const received = sum(
									transactions
										.filter((t) => t.amount > 0 && t.confirmations >= confirmationBlocks)
										.map((t) => t.amount)
								);

								satReceived = toSatoshis(received, 'BTC');
								payment.transactions = transactions.map((transaction) => ({
									id: transaction.txid,
									amount: transaction.amount,
									currency: 'BTC' as const
								}));
							}
							if (satReceived >= toSatoshis(payment.price.amount, payment.price.currency)) {
								order = await onOrderPayment(order, payment, {
									amount: satReceived,
									currency: 'SAT'
								});
							} else if (payment.expiresAt && payment.expiresAt < new Date()) {
								order = await onOrderPaymentFailed(order, payment, 'expired');
							}
						} catch (err) {
							console.error(inspect(err, { depth: 10 }));
						}
						break;
					case 'lightning':
						try {
							if (!payment.invoiceId) {
								throw new Error('Missing invoice ID on lightning payment');
							}
							if (!payment.processor) {
								throw new Error('Missing processor on lightning payment');
							}
							switch (payment.processor) {
								case 'sumup':
								case 'bitcoind':
								case 'stripe':
								case 'paypal':
								case 'bitcoin-nodeless':
									throw new Error(
										`Unsupported processor ${payment.processor} for lightning payments`
									);
								case 'btcpay-server':
									const invoice = await btcpayGetLnInvoice(payment.invoiceId);
									switch (invoice.status) {
										case 'Paid':
											order = await onOrderPayment(order, payment, {
												amount: Number(invoice.amountReceived) / 1000,
												currency: 'SAT'
											});
											break;
										case 'Unpaid':
											// Nothing to do.
											break;
										case 'Expired':
											order = await onOrderPaymentFailed(order, payment, 'expired');
											break;
										default:
											console.log(
												`Unexpected status for BTCPay Server invoice ${payment.invoiceId}: ${invoice.status}`
											);
											invoice.status satisfies never;
									}
									break;
								case 'swiss-bitcoin-pay':
									const invoiceId = payment.invoiceId;
									const paymentStatus = await sbpGetCheckoutStatus(invoiceId);
									if (paymentStatus.isPaid) {
										let currency = paymentStatus.unit?.toUpperCase();
										let amount = paymentStatus.amount;
										// Workaround undocumented behaviour in Swiss Bitcoin Pay.
										if (currency === undefined && paymentStatus.fiatUnit === 'sat') {
											currency = 'SAT';
											amount = paymentStatus.fiatAmount;
										}
										if (!typedInclude(CURRENCIES, currency)) {
											throw new Error(
												`SPB invoice ${invoiceId} was paid in unexpected currency ${currency}`
											);
										}
										order = await onOrderPayment(order, payment, {
											amount,
											currency
										});
									} else if (paymentStatus.isExpired) {
										order = await onOrderPaymentFailed(order, payment, 'expired');
									} else {
										// Payment is waiting. Nothing to do.
									}
									break;
								case 'lnd':
									const lndInvoice = await lndLookupInvoice(payment.invoiceId);
									if (lndInvoice.state === 'SETTLED') {
										order = await onOrderPayment(order, payment, {
											amount: lndInvoice.amt_paid_sat,
											currency: 'SAT'
										});
									} else if (lndInvoice.state === 'CANCELED') {
										order = await onOrderPaymentFailed(order, payment, 'expired');
									}
									break;
								case 'phoenixd':
									const phoenixdInvoice = await phoenixdLookupInvoice(payment.invoiceId);
									if (phoenixdInvoice.isPaid) {
										order = await onOrderPayment(
											order,
											payment,
											{
												amount: phoenixdInvoice.receivedSat,
												currency: 'SAT'
											},
											{
												fees: {
													amount: phoenixdInvoice.feesSat,
													currency: 'SAT'
												}
											}
										);
									} else {
										if (payment.expiresAt && payment.expiresAt < new Date()) {
											order = await onOrderPaymentFailed(order, payment, 'expired');
										}
									}
									break;
							}
						} catch (err) {
							console.error(inspect(err, { depth: 10 }));
						}
						break;
					case 'card':
						switch (payment.processor) {
							case 'sumup':
								try {
									order = await processCardPaymentSumup(order, payment);
								} catch (err) {
									console.error(inspect(err, { depth: 10 }));
								} finally {
									break;
								}
							case 'stripe':
								try {
									order = await processCardPaymentStripe(order, payment);
								} catch (err) {
									console.error(inspect(err, { depth: 10 }));
								}
								break;
							case 'paypal':
								try {
									order = await processCardPaymentPaypal(order, payment);
								} catch (err) {
									console.error(inspect(err, { depth: 10 }));
								}
								break;
							default:
								console.error('Unknown card processor', payment.processor);
						}
						break;
					case 'paypal':
						try {
							if (!isPaypalEnabled()) {
								throw new Error('Missing PayPal credentials');
							}

							if (!payment.checkoutId) {
								throw new Error('Missing checkout ID on PayPal order');
							}

							const checkout = await paypalGetCheckoutAndCapture(payment.checkoutId);

							if (checkout.status === 'COMPLETED') {
								order = await onOrderPayment(order, payment, {
									amount: Number(checkout.purchase_units[0].amount.value),
									currency: checkout.purchase_units[0].amount.currency_code
								});
							} else if (payment.expiresAt && payment.expiresAt < new Date()) {
								order = await onOrderPaymentFailed(order, payment, 'expired');
							} else if (checkout.status === 'VOIDED') {
								order = await onOrderPaymentFailed(order, payment, 'failed');
							}
						} catch (err) {
							console.error(inspect(err, { depth: 10 }));
						}
					case 'point-of-sale':
						try {
							if (payment.posTapToPay && payment.posTapToPay.expiresAt > new Date()) {
								switch (payment.processor) {
									case 'stripe':
										if (!isStripeEnabled()) {
											throw new Error(
												`Tap-to-pay payment ${payment._id} requests processor stripe but ` +
													'stripe is currently not configured.'
											);
										}
										const matchingPaymentReference = await findMatchingTapToPayOrderStripe(
											order,
											payment._id
										);
										if (matchingPaymentReference) {
											await onOrderPayment(order, payment, payment.price, {
												// Release the tap-to-pay lock
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
							}
						} catch (err) {
							console.error(inspect(err, { depth: 10 }));
						}
						break;
					// handled by admin
					case 'bank-transfer':
					case 'free':
						break;
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
