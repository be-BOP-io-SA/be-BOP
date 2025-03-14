import { collections } from '../database';
import { setTimeout } from 'node:timers/promises';
import { processClosed } from '../process';
import { listTransactions, orderAddressLabel } from '../bitcoind';
import { sum } from '$lib/utils/sum';
import { Lock } from '../lock';
import { inspect } from 'node:util';
import { lndLookupInvoice } from '../lnd';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { onOrderPayment, onOrderPaymentFailed } from '../orders';
import { refreshPromise, runtimeConfig, runtimeConfigUpdatedAt } from '../runtime-config';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
import { phoenixdLookupInvoice } from '../phoenixd';
import { CURRENCIES, CURRENCY_UNIT } from '$lib/types/Currency';
import { typedInclude } from '$lib/utils/typedIncludes';
import { isPaypalEnabled, paypalGetCheckout } from '../paypal';
import { differenceInMinutes } from 'date-fns';
import { z } from 'zod';
import { getSatoshiReceivedNodeless } from '../bitcoin-nodeless';
import { trimSuffix } from '$lib/utils/trimSuffix';

const lock = new Lock('orders');

async function maintainOrders() {
	await refreshPromise;

	while (!processClosed) {
		if (!lock.ownsLock) {
			await setTimeout(5_000);
			continue;
		}

		const pendingOrders = await collections.orders
			.find({ 'payments.status': 'pending', status: 'pending' })
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
								throw new Error('Missing invoice ID on lightning order');
							}
							if (payment.processor === 'phoenixd') {
								const invoice = await phoenixdLookupInvoice(payment.invoiceId);

								if (invoice.isPaid) {
									order = await onOrderPayment(
										order,
										payment,
										{
											amount: invoice.receivedSat,
											currency: 'SAT'
										},
										{
											fees: {
												amount: invoice.feesSat,
												currency: 'SAT'
											}
										}
									);
								} else {
									if (payment.expiresAt && payment.expiresAt < new Date()) {
										order = await onOrderPaymentFailed(order, payment, 'expired');
									}
								}
							} else {
								const invoice = await lndLookupInvoice(payment.invoiceId);

								if (invoice.state === 'SETTLED') {
									order = await onOrderPayment(order, payment, {
										amount: invoice.amt_paid_sat,
										currency: 'SAT'
									});
								} else if (invoice.state === 'CANCELED') {
									order = await onOrderPaymentFailed(order, payment, 'expired');
								}
							}
						} catch (err) {
							console.error(inspect(err, { depth: 10 }));
						}
						break;
					case 'card':
						switch (payment.processor) {
							case 'sumup':
								try {
									if (!runtimeConfig.sumUp.apiKey) {
										throw new Error('Missing sumup API key');
									}
									const checkoutId = payment.checkoutId;

									if (!checkoutId) {
										throw new Error('Missing checkout ID on card order');
									}

									const response = await fetch(
										'https://api.sumup.com/v0.1/checkouts/' + checkoutId,
										{
											headers: {
												Authorization: 'Bearer ' + runtimeConfig.sumUp.apiKey
											},
											...{ autoSelectFamily: true }
										}
									);

									if (!response.ok) {
										throw new Error(
											'Failed to fetch checkout status for order ' +
												order._id +
												', checkout ' +
												checkoutId
										);
									}

									const checkout = await response.json();

									if (checkout.status === 'PAID') {
										payment.transactions = checkout.transactions;
										order = await onOrderPayment(order, payment, {
											amount: checkout.amount,
											currency: checkout.currency
										});
									} else if (checkout.status === 'FAILED') {
										order = await onOrderPaymentFailed(order, payment, 'failed');
									} else if (checkout.status === 'EXPIRED') {
										order = await onOrderPaymentFailed(order, payment, 'expired');
									}
								} catch (err) {
									console.error(inspect(err, { depth: 10 }));
								} finally {
									break;
								}
							case 'stripe':
								try {
									if (!runtimeConfig.stripe.secretKey) {
										throw new Error('Missing stripe secret key');
									}
									const paymentId = payment.checkoutId;

									if (!paymentId) {
										throw new Error('Missing checkout id on stripe order');
									}

									// Fetch payment intent
									const response = await fetch(
										'https://api.stripe.com/v1/payment_intents/' + paymentId,

										{
											headers: {
												Authorization: 'Bearer ' + runtimeConfig.stripe.secretKey
											}
										}
									);

									if (!response.ok) {
										throw new Error(
											'Failed to fetch payment intent status for order ' +
												order._id +
												', payment intent ' +
												paymentId
										);
									}

									const paymentIntent: {
										status: string;
										amount_received: number;
										currency: string;
									} = await response.json();

									if (paymentIntent.status === 'succeeded') {
										const currency = paymentIntent.currency.toUpperCase();

										if (!typedInclude(CURRENCIES, currency)) {
											throw new Error('Unknown currency ' + currency);
										}

										order = await onOrderPayment(order, payment, {
											amount: paymentIntent.amount_received * CURRENCY_UNIT[currency],
											currency: currency
										});
									} else if (paymentIntent.status === 'canceled') {
										order = await onOrderPaymentFailed(order, payment, 'failed');
									} else if (payment.expiresAt && new Date() > payment.expiresAt) {
										const cancelResponse = await fetch(
											'https://api.stripe.com/v1/payment_intents/' + paymentId + '/cancel',
											{
												method: 'POST',
												headers: {
													Authorization: 'Bearer ' + runtimeConfig.stripe.secretKey
												}
											}
										);

										if (!cancelResponse.ok) {
											throw new Error(
												'Failed to cancel payment intent for order ' +
													order._id +
													', payment intent ' +
													paymentId
											);
										}
										order = await onOrderPaymentFailed(order, payment, 'expired');
									}
								} catch (err) {
									console.error(inspect(err, { depth: 10 }));
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

									const checkout = await paypalGetCheckout(payment.checkoutId);

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

							const checkout = await paypalGetCheckout(payment.checkoutId);

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
					// handled by admin
					case 'bank-transfer':
					case 'point-of-sale':
					case 'free':
						break;
				}
			}
		}

		await setTimeout(2_000);
	}
}

maintainOrders();
