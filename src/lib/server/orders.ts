import {
	orderAmountWithNoPaymentsCreated,
	type DiscountType,
	type Order,
	type OrderPayment,
	type Price,
	type OrderPaymentStatus
} from '$lib/types/Order';
import { ClientSession, ObjectId, type WithId } from 'mongodb';
import { collections, withTransaction } from './database';
import { add, addHours, addMinutes, differenceInSeconds, max, subSeconds } from 'date-fns';
import { runtimeConfig } from './runtime-config';
import { generateSubscriptionNumber } from './subscriptions';
import {
	checkProductVariationsIntegrity,
	productPriceWithVariations,
	type Product
} from '$lib/types/Product';
import { error } from '@sveltejs/kit';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { currentWallet, getNewAddress, orderAddressLabel } from './bitcoind';
import { lndCreateInvoice } from './lnd';
import { ORIGIN } from '$env/static/private';
import { emailsEnabled, queueEmail } from './email';
import { sum } from '$lib/utils/sum';
import { computeDeliveryFees, type Cart, computePriceInfo } from '$lib/types/Cart';
import { CURRENCY_UNIT, FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import { sumCurrency } from '$lib/utils/sumCurrency';
import { refreshAvailableStockInDb } from './product';
import { checkCartItems } from './cart';
import { userQuery } from './user';
import { SMTP_USER } from '$env/static/private';
import { toCurrency } from '$lib/utils/toCurrency';
import { CUSTOMER_ROLE_ID, POS_ROLE_ID } from '$lib/types/User';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import type { PaymentMethod, PaymentProcessor } from './payment-methods';
import type { CountryAlpha2 } from '$lib/types/Country';
import { filterUndef } from '$lib/utils/filterUndef';
import type { LanguageKey } from '$lib/translations';
import { filterNullish } from '$lib/utils/fillterNullish';
import { toUrlEncoded } from '$lib/utils/toUrlEncoded';
import { isPhoenixdConfigured, phoenixdCreateInvoice } from './phoenixd';
import { isSumupEnabled } from './sumup';
import { isStripeEnabled } from './stripe';
import { isPaypalEnabled, paypalAccessToken, paypalApiOrigin } from './paypal';
import {
	bip84Address,
	generateDerivationIndex,
	isBitcoinNodelessConfigured
} from './bitcoin-nodeless';

async function generateOrderNumber(): Promise<number> {
	const res = await collections.runtimeConfig.findOneAndUpdate(
		{ _id: 'orderNumber' },
		{ $inc: { data: 1 as never } },
		{ upsert: true, returnDocument: 'after' }
	);

	if (!res.value) {
		throw new Error('Failed to increment order number');
	}

	return res.value.data as number;
}

export function isOrderFullyPaid(order: Order, opts?: { includePendingOrders?: boolean }): boolean {
	const unit = CURRENCY_UNIT[order.currencySnapshot.main.totalPrice.currency];
	// Special case: no payments yet and order of 0.01€ => it's not fully paid
	if (order.currencySnapshot.main.totalPrice.amount >= unit && order.payments.length === 0) {
		return false;
	}
	return (
		sumCurrency(
			order.currencySnapshot.main.totalPrice.currency,
			order.payments
				.filter(
					(payment) =>
						payment.status === 'paid' ||
						(opts?.includePendingOrders && payment.status === 'pending')
				)
				.map((payment) => payment.currencySnapshot.main.price)
		) >=
		order.currencySnapshot.main.totalPrice.amount - unit
	);
}

export async function onOrderPayment(
	order: Order,
	payment: Order['payments'][0],
	received: Price,
	params?: {
		bankTransferNumber?: string;
		detail?: string;
		fees?: Price;
		providedSession?: ClientSession;
	}
): Promise<Order> {
	const invoiceNumber = ((await lastInvoiceNumber()) ?? 0) + 1;

	if (!order.payments.includes(payment)) {
		throw new Error('Sync broken between order and payment');
	}

	const paidAt = new Date();

	payment.status = 'paid'; // for isOrderFullyPaid
	payment.paidAt = paidAt;
	const fn = async (session: ClientSession) => {
		const ret = await collections.orders.findOneAndUpdate(
			{ _id: order._id, 'payments._id': payment._id },
			{
				$set: {
					'payments.$.invoice': {
						number: invoiceNumber,
						createdAt: new Date()
					},
					'payments.$.status': 'paid',
					...(params?.bankTransferNumber && {
						'payments.$.bankTransferNumber': params.bankTransferNumber
					}),
					...(params?.detail && {
						'payments.$.detail': params.detail
					}),
					'payments.$.paidAt': paidAt,
					...(isOrderFullyPaid(order) && {
						status: 'paid'
					}),
					'payments.$.received': received,
					...(params?.fees && {
						'payments.$.fees': params.fees,
						'payments.$.currencySnapshot.main.fees': {
							currency: payment.currencySnapshot.main.price.currency,
							amount: toCurrency(
								payment.currencySnapshot.main.price.currency,
								params.fees.amount,
								params.fees.currency
							)
						},
						...(payment.currencySnapshot.secondary && {
							'payments.$.currencySnapshot.secondary.fees': {
								currency: payment.currencySnapshot.secondary.price.currency,
								amount: toCurrency(
									payment.currencySnapshot.secondary.price.currency,
									params.fees.amount,
									params.fees.currency
								)
							}
						}),
						'payments.$.currencySnapshot.priceReference.fees': {
							currency: payment.currencySnapshot.priceReference.price.currency,
							amount: toCurrency(
								payment.currencySnapshot.priceReference.price.currency,
								params.fees.amount,
								params.fees.currency
							)
						},
						...(payment.currencySnapshot.accounting && {
							'payments.$.currencySnapshot.accounting.fees': {
								currency: payment.currencySnapshot.accounting.price.currency,
								amount: toCurrency(
									payment.currencySnapshot.accounting.price.currency,
									params.fees.amount,
									params.fees.currency
								)
							}
						})
					}),
					'payments.$.currencySnapshot.main.previouslyPaid': {
						currency: payment.currencySnapshot.main.price.currency,
						amount: sumCurrency(
							payment.currencySnapshot.main.price.currency,
							order.payments
								.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt < paidAt)
								.map((p) => p.currencySnapshot.main.price)
						)
					},
					'payments.$.currencySnapshot.main.remainingToPay': {
						currency: payment.currencySnapshot.main.price.currency,
						amount: sumCurrency(payment.currencySnapshot.main.price.currency, [
							order.currencySnapshot.main.totalPrice,
							...order.payments
								.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt <= paidAt)
								.map((p) => p.currencySnapshot.main.price)
								.map((p) => ({ currency: p.currency, amount: -p.amount }))
						])
					},
					'payments.$.currencySnapshot.main.received': {
						currency: payment.currencySnapshot.main.price.currency,
						amount: toCurrency(
							payment.currencySnapshot.main.price.currency,
							received.amount,
							received.currency
						)
					},
					'payments.$.currencySnapshot.priceReference.previouslyPaid': {
						currency: payment.currencySnapshot.priceReference.price.currency,
						amount: sumCurrency(
							payment.currencySnapshot.priceReference.price.currency,
							order.payments
								.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt < paidAt)
								.map((p) => p.currencySnapshot.priceReference.price)
						)
					},
					'payments.$.currencySnapshot.priceReference.remainingToPay': {
						currency: payment.currencySnapshot.priceReference.price.currency,
						amount: sumCurrency(payment.currencySnapshot.priceReference.price.currency, [
							order.currencySnapshot.priceReference.totalPrice,
							...order.payments
								.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt <= paidAt)
								.map((p) => p.currencySnapshot.priceReference.price)
								.map((p) => ({ currency: p.currency, amount: -p.amount }))
						])
					},
					'payments.$.currencySnapshot.priceReference.received': {
						currency: payment.currencySnapshot.priceReference.price.currency,
						amount: toCurrency(
							payment.currencySnapshot.priceReference.price.currency,
							received.amount,
							received.currency
						)
					},
					...(payment.currencySnapshot.secondary &&
						order.currencySnapshot.secondary && {
							'payments.$.currencySnapshot.secondary.previouslyPaid': {
								currency: payment.currencySnapshot.secondary.price.currency,
								amount: sumCurrency(
									payment.currencySnapshot.secondary.price.currency,
									filterUndef(
										order.payments
											.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt < paidAt)
											.map((p) => p.currencySnapshot.secondary?.price)
									)
								)
							},
							'payments.$.currencySnapshot.secondary.remainingToPay': {
								currency: payment.currencySnapshot.secondary.price.currency,
								amount: sumCurrency(payment.currencySnapshot.secondary.price.currency, [
									order.currencySnapshot.secondary.totalPrice,
									...filterUndef(
										order.payments
											.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt <= paidAt)
											.map((p) => p.currencySnapshot.secondary?.price)
									).map((p) => ({ currency: p.currency, amount: -p.amount }))
								])
							},
							'payments.$.currencySnapshot.secondary.received': {
								currency: payment.currencySnapshot.secondary.price.currency,
								amount: toCurrency(
									payment.currencySnapshot.secondary.price.currency,
									received.amount,
									received.currency
								)
							}
						}),
					...(payment.currencySnapshot.accounting &&
						order.currencySnapshot.accounting && {
							'payments.$.currencySnapshot.accounting.previouslyPaid': {
								currency: payment.currencySnapshot.accounting.price.currency,
								amount: sumCurrency(
									payment.currencySnapshot.accounting.price.currency,
									filterUndef(
										order.payments
											.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt < paidAt)
											.map((p) => p.currencySnapshot.accounting?.price)
									)
								)
							},
							'payments.$.currencySnapshot.accounting.remainingToPay': {
								currency: payment.currencySnapshot.accounting.price.currency,
								amount: sumCurrency(payment.currencySnapshot.accounting.price.currency, [
									order.currencySnapshot.accounting.totalPrice,
									...filterUndef(
										order.payments
											.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt <= paidAt)
											.map((p) => p.currencySnapshot.accounting?.price)
									).map((p) => ({ currency: p.currency, amount: -p.amount }))
								])
							},
							'payments.$.currencySnapshot.accounting.received': {
								currency: payment.currencySnapshot.accounting.price.currency,
								amount: toCurrency(
									payment.currencySnapshot.accounting.price.currency,
									received.amount,
									received.currency
								)
							}
						}),
					'payments.$.transactions': payment.transactions,
					'currencySnapshot.main.totalReceived': {
						amount:
							toCurrency(
								order.currencySnapshot.main.totalReceived?.currency ?? runtimeConfig.mainCurrency,
								received.amount,
								received.currency
							) + (order.currencySnapshot.main.totalReceived?.amount ?? 0),
						currency:
							order.currencySnapshot.main.totalReceived?.currency ?? runtimeConfig.mainCurrency
					},
					...(runtimeConfig.secondaryCurrency && {
						'currencySnapshot.secondary.totalReceived': {
							amount:
								toCurrency(
									order.currencySnapshot.secondary?.totalReceived?.currency ??
										runtimeConfig.secondaryCurrency,
									received.amount,
									received.currency
								) + (order.currencySnapshot.secondary?.totalReceived?.amount ?? 0),
							currency:
								order.currencySnapshot.secondary?.totalReceived?.currency ??
								runtimeConfig.secondaryCurrency
						}
					}),
					'currencySnapshot.priceReference.totalReceived': {
						amount:
							toCurrency(
								order.currencySnapshot.priceReference.totalReceived?.currency ??
									runtimeConfig.priceReferenceCurrency,
								received.amount,
								received.currency
							) + (order.currencySnapshot.priceReference.totalReceived?.amount ?? 0),
						currency:
							order.currencySnapshot.priceReference.totalReceived?.currency ??
							runtimeConfig.priceReferenceCurrency
					},
					updatedAt: new Date()
				}
			},
			{ session, returnDocument: 'after' }
		);

		if (!ret.value) {
			throw new Error('Failed to update order');
		}

		order = ret.value;
		if (order.status === 'paid') {
			await updateAfterOrderPaid(order, session);
		}

		return ret.value;
	};
	return params?.providedSession ? await fn(params.providedSession) : await withTransaction(fn);
}

export async function onOrderPaymentFailed(
	order: Order,
	payment: Order['payments'][0],
	reason: Exclude<OrderPaymentStatus, Exclude<OrderPaymentStatus, 'canceled' | 'expired'>>
): Promise<Order> {
	if (!order.payments.includes(payment)) {
		throw new Error('Sync broken between order and payment');
	}

	payment.status = reason; // for  below

	return await withTransaction(async (session) => {
		const ret = await collections.orders.findOneAndUpdate(
			{
				_id: order._id,
				'payments._id': payment._id
			},
			{
				$set: {
					'payments.$.status': reason,
					...(order.payments.every(
						(payment) => payment.status === 'canceled' || payment.status === 'expired'
					) &&
						order.status === 'pending' && {
							status: reason
						})
				}
			},
			{ returnDocument: 'after', session }
		);
		if (!ret.value) {
			throw new Error('Failed to update order');
		}
		order = ret.value;

		return order;
	});
}

export async function lastInvoiceNumber(): Promise<number | undefined> {
	return (
		await collections.orders
			.aggregate<{ invoiceNumber: number }>([
				{
					$match: {
						'payments.invoice.number': { $exists: true }
					}
				},
				{
					$sort: {
						'payments.invoice.number': -1
					}
				},
				{
					$limit: 1
				},
				{
					$project: {
						'payments.invoice.number': 1
					}
				},
				{
					$unwind: {
						path: '$payments'
					}
				},
				{
					$match: {
						'payments.invoice.number': { $exists: true }
					}
				},
				{
					$sort: {
						'payments.invoice.number': -1
					}
				},
				{
					$limit: 1
				},
				{
					$project: {
						invoiceNumber: '$payments.invoice.number'
					}
				}
			])
			.next()
	)?.invoiceNumber;
}

export async function createOrder(
	items: Array<{
		quantity: number;
		product: Product;
		customPrice?: { amount: number; currency: Currency };
		chosenVariations?: Record<string, string>;
		depositPercentage?: number;
	}>,
	// null when point of sale want to use multiple payment methods
	paymentMethod: PaymentMethod | null,
	params: {
		locale: LanguageKey;
		user: UserIdentifier;
		notifications?: {
			paymentStatus?: {
				npub?: string;
				email?: string;
			};
		};
		/**
		 * Will automatically delete the cart after the order is created
		 *
		 * Also, allows using the stock reserved by the cart
		 */
		cart?: WithId<Cart>;
		userVatCountry: CountryAlpha2 | undefined;
		shippingAddress: Order['shippingAddress'] | null;
		billingAddress?: Order['billingAddress'] | null;
		reasonFreeVat?: string;
		reasonOfferDeliveryFees?: string;
		discount?: {
			amount: number;
			type: DiscountType;
			justification: string;
		};
		clientIp?: string;
		note?: string;
		receiptNote?: string;
		engagements?: {
			acceptedTermsOfUse?: boolean;
			acceptedIPCollect?: boolean;
			acceptedDepositConditionsAndFullPayment?: boolean;
			acceptedExportationAndVATObligation?: boolean;
		};
		onLocation?: boolean;
		paymentTimeOut?: number;
	}
): Promise<Order['_id']> {
	const npubAddress = params.notifications?.paymentStatus?.npub;
	const email = params.notifications?.paymentStatus?.email;

	const canBeNotified = !!(npubAddress || (emailsEnabled && email));

	if (
		!canBeNotified &&
		paymentMethod !== 'point-of-sale' &&
		paymentMethod !== null &&
		params.user.userRoleId !== POS_ROLE_ID
	) {
		throw error(400, emailsEnabled ? 'Missing npub address or email' : 'Missing npub address');
	}

	const products = items.map((item) => item.product);
	if (
		products.some(
			(product) => product.availableDate && !product.preorder && product.availableDate > new Date()
		)
	) {
		throw error(
			400,
			'Cart contains products that are not yet available: ' +
				products
					.filter(
						(product) =>
							product.availableDate && !product.preorder && product.availableDate > new Date()
					)
					.map((product) => product.name)
					.join(', ')
		);
	}

	await checkCartItems(items, params.cart);

	const isDigital = products.every((product) => !product.shipping);
	const shippingPrice = {
		currency: runtimeConfig.mainCurrency,
		amount: 0
	};

	if (!isDigital) {
		if (!params.shippingAddress) {
			throw error(400, 'Shipping address is required');
		} else {
			const { country } = params.shippingAddress;
			if (!params.reasonOfferDeliveryFees) {
				shippingPrice.amount = computeDeliveryFees(
					runtimeConfig.mainCurrency,
					country,
					items,
					runtimeConfig.deliveryFees
				);
			}

			if (isNaN(shippingPrice.amount)) {
				throw error(400, 'Some products are not available in your country');
			}
		}
	}

	const discountInfo =
		params.user.userRoleId === POS_ROLE_ID && params?.discount?.amount ? params.discount : null;

	const vatProfiles = products.some((p) => p.vatProfileId)
		? await collections.vatProfiles
				.find({ _id: { $in: filterNullish(products.map((p) => p.vatProfileId)) } })
				.toArray()
		: [];

	const vatExempted = runtimeConfig.vatExempted || !!params.reasonFreeVat;
	const priceInfo = computePriceInfo(items, {
		deliveryFees: shippingPrice,
		vatExempted,
		userCountry: params.userVatCountry,
		bebopCountry: runtimeConfig.vatCountry || undefined,
		vatNullOutsideSellerCountry: runtimeConfig.vatNullOutsideSellerCountry,
		vatSingleCountry: runtimeConfig.vatSingleCountry,
		discount: discountInfo,
		vatProfiles: vatProfiles
	});
	const vatExemptedReason = vatExempted
		? params.reasonFreeVat || runtimeConfig.vatExemptionReason
		: undefined;

	const totalSatoshis = toSatoshis(priceInfo.totalPriceWithVat, priceInfo.currency);
	const partialSatoshis = toSatoshis(priceInfo.partialPriceWithVat, priceInfo.currency);

	const orderNumber = await generateOrderNumber();
	const orderId = crypto.randomUUID();

	let discount: {
		currency: Currency;
		amount: number;
	} | null = null;
	if (priceInfo.discount && params.discount && params.user.userRoleId === POS_ROLE_ID) {
		discount = {
			currency: params.discount.type === 'fiat' ? runtimeConfig.mainCurrency : 'SAT',
			amount: params.discount.type === 'fiat' ? params?.discount?.amount : priceInfo.discount
		};

		await collections.emailNotifications.insertOne({
			_id: new ObjectId(),
			createdAt: new Date(),
			updatedAt: new Date(),
			subject: 'NEW DISCOUNT',
			htmlContent: `A discount of ${params?.discount?.amount}${
				params.discount.type === 'fiat' ? runtimeConfig.mainCurrency : '%'
			} (${toCurrency(
				'SAT',
				priceInfo.discount,
				priceInfo.currency
			)} SAT) has been applied to the <a href="${ORIGIN}/order/${orderId}">order ${orderNumber}</a> (${toCurrency(
				runtimeConfig.mainCurrency,
				totalSatoshis,
				'SAT'
			)}${runtimeConfig.mainCurrency}). The discount was applied by ${
				params.user.userLogin
			}. Justification: ${params?.discount?.justification ?? '-'} `,
			dest: runtimeConfig.sellerIdentity?.contact.email || SMTP_USER
		});
	}

	const subscriptions = items.filter((item) => item.product.type === 'subscription');

	if (subscriptions.length && !canBeNotified) {
		throw error(400, 'Missing npub address or email for subscription');
	}

	for (const subscription of subscriptions) {
		const product = subscription.product;

		if (subscription.quantity > 1) {
			throw error(
				400,
				'Cannot order more than one of a subscription at a time for product: ' + product.name
			);
		}

		const existingSubscription = await collections.paidSubscriptions.findOne({
			...userQuery(params.user),
			productId: product._id
		});

		if (existingSubscription) {
			if (
				subSeconds(existingSubscription.paidUntil, runtimeConfig.subscriptionReminderSeconds) >
				new Date()
			) {
				throw error(
					400,
					'You already have an active subscription for this product: ' +
						product.name +
						', which is not due for renewal yet.'
				);
			}
		}

		if (
			await collections.orders.countDocuments(
				{
					...userQuery(params.user),
					'items.product._id': product._id,
					'payment.status': 'pending'
				},
				{ limit: 1 }
			)
		) {
			throw error(400, 'You already have a pending order for this product: ' + product.name);
		}
	}

	if (runtimeConfig.collectIPOnDeliverylessOrders && !params.shippingAddress && !params.clientIp) {
		throw error(400, 'Missing IP address for deliveryless order');
	}
	const billingAddress = params.billingAddress || params.shippingAddress;

	if (runtimeConfig.isBillingAddressMandatory && !params.billingAddress) {
		throw error(400, 'Missing billing address for deliveryless order');
	}

	if (paymentMethod === 'free' && totalSatoshis !== 0) {
		throw error(400, "You can't use free payment method on this order");
	}

	for (const item of items) {
		if (
			item.product.variations?.length &&
			!item.product.payWhatYouWant &&
			checkProductVariationsIntegrity(item.product, item.chosenVariations)
		) {
			item.customPrice = {
				amount: productPriceWithVariations(item.product, item.chosenVariations),
				currency: item.product.price.currency
			};
		} else if (item.product.variations?.length && !item.product.payWhatYouWant) {
			throw error(400, 'error matching on variations choice');
		}
	}

	await withTransaction(async (session) => {
		const order: Order = {
			_id: orderId,
			locale: params.locale,
			number: orderNumber,
			createdAt: new Date(),
			updatedAt: new Date(),
			status: 'pending',
			sellerIdentity: runtimeConfig.sellerIdentity,
			items: items.map((item, i) => ({
				quantity: item.quantity,
				product: item.product,
				customPrice: item.customPrice,
				chosenVariations: item.chosenVariations,
				depositPercentage: item.depositPercentage,
				vatRate: priceInfo.vatRates[i],
				currencySnapshot: {
					main: {
						price: {
							amount: toCurrency(
								runtimeConfig.mainCurrency,
								item.product.price.amount,
								item.product.price.currency
							),
							currency: runtimeConfig.mainCurrency
						},
						...(item.customPrice && {
							customPrice: {
								amount: toCurrency(
									runtimeConfig.mainCurrency,
									item.customPrice.amount,
									item.customPrice.currency
								),
								currency: runtimeConfig.mainCurrency
							}
						})
					},
					...(runtimeConfig.secondaryCurrency && {
						secondary: {
							price: {
								amount: toCurrency(
									runtimeConfig.secondaryCurrency,
									item.product.price.amount,
									item.product.price.currency
								),
								currency: runtimeConfig.secondaryCurrency
							},
							...(item.customPrice && {
								customPrice: {
									amount: toCurrency(
										runtimeConfig.secondaryCurrency,
										item.customPrice.amount,
										item.customPrice.currency
									),
									currency: runtimeConfig.secondaryCurrency
								}
							})
						}
					}),
					...(runtimeConfig.accountingCurrency && {
						accounting: {
							price: {
								amount: toCurrency(
									runtimeConfig.accountingCurrency,
									item.product.price.amount,
									item.product.price.currency
								),
								currency: runtimeConfig.accountingCurrency
							},
							...(item.customPrice && {
								customPrice: {
									amount: toCurrency(
										runtimeConfig.accountingCurrency,
										item.customPrice.amount,
										item.customPrice.currency
									),
									currency: runtimeConfig.accountingCurrency
								}
							})
						}
					}),
					priceReference: {
						price: {
							amount: toCurrency(
								runtimeConfig.priceReferenceCurrency,
								item.product.price.amount,
								item.product.price.currency
							),
							currency: runtimeConfig.priceReferenceCurrency
						},
						...(item.customPrice && {
							customPrice: {
								amount: toCurrency(
									runtimeConfig.priceReferenceCurrency,
									item.customPrice.amount,
									item.customPrice.currency
								),
								currency: runtimeConfig.priceReferenceCurrency
							}
						})
					}
				}
			})),
			...(params.shippingAddress && { shippingAddress: params.shippingAddress }),
			...(billingAddress && { billingAddress: billingAddress }),
			...(priceInfo.vat.length && { vat: priceInfo.vat }),
			...(shippingPrice
				? {
						shippingPrice
				  }
				: undefined),
			payments: [],
			notifications: {
				paymentStatus: {
					...(npubAddress && { npub: npubAddress }),
					...(email && { email })
				}
			},
			user: {
				...params.user,
				// In case the user didn't authenticate with an email/npub but only added them as notification address
				// We still add them add orders for the specified email/npub
				// Mini-downside: if the user put a dummy npub / email, the owner of the npub / email will be able to see the order
				...(!params.user.email && email && { email }),
				...(!params.user.npub && npubAddress && { npub: npubAddress })
			},
			...(vatExemptedReason && {
				vatFree: {
					reason: vatExemptedReason
				}
			}),
			...(discount &&
				params.discount && {
					discount: {
						price: discount,
						justification: params.discount.justification,
						type: params.discount.type
					}
				}),
			...(params.clientIp && { clientIp: params.clientIp }),
			currencySnapshot: {
				main: {
					totalPrice: {
						amount: toCurrency(runtimeConfig.mainCurrency, totalSatoshis, 'SAT'),
						currency: runtimeConfig.mainCurrency
					},
					...(shippingPrice && {
						shippingPrice: {
							amount: toCurrency(
								runtimeConfig.mainCurrency,
								shippingPrice.amount,
								shippingPrice.currency
							),
							currency: runtimeConfig.mainCurrency
						}
					}),
					...(priceInfo.totalVat && {
						vat: priceInfo.vat.map(({ price }) => ({
							amount: toCurrency(runtimeConfig.mainCurrency, price.amount, price.currency),
							currency: runtimeConfig.mainCurrency
						}))
					}),
					...(discount && {
						discount: {
							amount: toCurrency(runtimeConfig.mainCurrency, discount.amount, discount.currency),
							currency: runtimeConfig.mainCurrency
						}
					})
				},
				...(runtimeConfig.secondaryCurrency && {
					secondary: {
						totalPrice: {
							amount: toCurrency(runtimeConfig.secondaryCurrency, totalSatoshis, 'SAT'),
							currency: runtimeConfig.secondaryCurrency
						},
						...(shippingPrice && {
							shippingPrice: {
								amount: toCurrency(
									runtimeConfig.secondaryCurrency,
									shippingPrice.amount,
									shippingPrice.currency
								),
								currency: runtimeConfig.secondaryCurrency
							}
						}),
						...(priceInfo.totalVat && {
							vat: priceInfo.vat.map(({ price }) => ({
								amount: toCurrency(
									// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
									runtimeConfig.secondaryCurrency!,
									price.amount,
									price.currency
								),
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								currency: runtimeConfig.secondaryCurrency!
							}))
						}),
						...(discount && {
							discount: {
								amount: toCurrency(
									runtimeConfig.secondaryCurrency,
									discount.amount,
									discount.currency
								),
								currency: runtimeConfig.secondaryCurrency
							}
						})
					}
				}),
				...(runtimeConfig.accountingCurrency && {
					accounting: {
						totalPrice: {
							amount: toCurrency(runtimeConfig.accountingCurrency, totalSatoshis, 'SAT'),
							currency: runtimeConfig.accountingCurrency
						},
						...(shippingPrice && {
							shippingPrice: {
								amount: toCurrency(
									runtimeConfig.accountingCurrency,
									shippingPrice.amount,
									shippingPrice.currency
								),
								currency: runtimeConfig.accountingCurrency
							}
						}),
						...(priceInfo.totalVat && {
							vat: priceInfo.vat.map(({ price }) => ({
								amount: toCurrency(
									// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
									runtimeConfig.accountingCurrency!,
									price.amount,
									price.currency
								),
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								currency: runtimeConfig.accountingCurrency!
							}))
						}),
						...(discount && {
							discount: {
								amount: toCurrency(
									runtimeConfig.accountingCurrency,
									discount.amount,
									discount.currency
								),
								currency: runtimeConfig.accountingCurrency
							}
						})
					}
				}),
				priceReference: {
					totalPrice: {
						amount: toCurrency(runtimeConfig.priceReferenceCurrency, totalSatoshis, 'SAT'),
						currency: runtimeConfig.priceReferenceCurrency
					},
					...(shippingPrice && {
						shippingPrice: {
							amount: toCurrency(
								runtimeConfig.priceReferenceCurrency,
								shippingPrice.amount,
								shippingPrice.currency
							),
							currency: runtimeConfig.priceReferenceCurrency
						}
					}),
					...(priceInfo.totalVat && {
						vat: priceInfo.vat.map(({ price }) => ({
							amount: toCurrency(
								runtimeConfig.priceReferenceCurrency,
								price.amount,
								price.currency
							),
							currency: runtimeConfig.priceReferenceCurrency
						}))
					}),
					...(discount && {
						discount: {
							amount: toCurrency(
								runtimeConfig.priceReferenceCurrency,
								discount.amount,
								discount.currency
							),
							currency: runtimeConfig.priceReferenceCurrency
						}
					})
				}
			},
			...(params.note && {
				notes: [
					{
						content: params.note,
						createdAt: new Date(),
						role: params.user.userRoleId || CUSTOMER_ROLE_ID,
						...(params.user && { userId: params.user.userId }),
						...(npubAddress && { npub: npubAddress }),
						...(email && { email })
					}
				]
			}),
			...(params.receiptNote && { receiptNote: params.receiptNote }),
			...(params.reasonOfferDeliveryFees && {
				deliveryFeesFree: {
					reason: params.reasonOfferDeliveryFees
				}
			}),
			...(params.engagements && { engagements: params.engagements }),
			...(params.onLocation && { onLocation: params.onLocation })
		};
		await collections.orders.insertOne(order, { session });

		let orderPayment: OrderPayment | undefined = undefined;
		if (paymentMethod) {
			const expiresAt = paymentMethodExpiration(paymentMethod, {
				paymentTimeout: params.paymentTimeOut
			});

			orderPayment = await addOrderPayment(
				order,
				paymentMethod,
				{ currency: 'SAT', amount: partialSatoshis },
				{ session, expiresAt }
			);
			order.payments.push(orderPayment);
		}

		if (params.cart) {
			/** Also delete "old" carts with partial user info */
			await collections.carts.deleteMany(userQuery(params.cart.user), { session });
		}

		for (const product of products) {
			if (product.stock) {
				await refreshAvailableStockInDb(product._id, session);
			}
		}
		if (orderPayment?.method === 'free') {
			await onOrderPayment(order, orderPayment, orderPayment.price, { providedSession: session });
		}
	});

	return orderId;
}

async function generatePaymentInfo(params: {
	method: PaymentMethod;
	orderId: string;
	orderNumber: number;
	toPay: Price;
	paymentId: ObjectId;
	expiresAt?: Date;
}): Promise<{
	address?: string;
	wallet?: string;
	label?: string;
	invoiceId?: string;
	checkoutId?: string;
	meta?: unknown;
	processor?: PaymentProcessor;
}> {
	switch (params.method) {
		case 'bitcoin':
			if (isBitcoinNodelessConfigured()) {
				return {
					address: bip84Address(
						runtimeConfig.bitcoinNodeless.publicKey,
						await generateDerivationIndex()
					),
					processor: 'bitcoin-nodeless'
				};
			}
			return {
				address: await getNewAddress(orderAddressLabel(params.orderId, params.paymentId)),
				wallet: await currentWallet(),
				label: orderAddressLabel(params.orderId, params.paymentId),
				processor: 'bitcoind'
			};
		case 'lightning': {
			const label = (() => {
				switch (runtimeConfig.lightningQrCodeDescription) {
					case 'brand':
						return runtimeConfig.brandName;
					case 'orderUrl':
						return `${ORIGIN}/order/${params.orderId}`;
					case 'brandAndOrderNumber':
						return `${runtimeConfig.brandName} - Order #${params.orderNumber.toLocaleString('en')}`;
					default:
						return '';
				}
			})();
			const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
			if (isPhoenixdConfigured()) {
				// no way to configure an expiration date for now
				const invoice = await phoenixdCreateInvoice(satoshis, label, params.orderId);

				return {
					address: invoice.payment_address,
					invoiceId: invoice.r_hash,
					processor: 'phoenixd'
				};
			} else {
				const invoice = await lndCreateInvoice(satoshis, {
					...(params.expiresAt && {
						expireAfterSeconds: differenceInSeconds(params.expiresAt, new Date())
					}),
					label
				});

				return {
					address: invoice.payment_request,
					invoiceId: invoice.r_hash,
					processor: 'lnd'
				};
			}
		}
		case 'point-of-sale': {
		}
		case 'free': {
			return {};
		}
		case 'bank-transfer': {
			return { address: runtimeConfig.sellerIdentity?.bank?.iban };
		}
		case 'card':
			return await generateCardPaymentInfo(params);
		case 'paypal':
			return await generatePaypalPaymentInfo(params);
	}
}

async function generateCardPaymentInfo(params: {
	orderId: string;
	orderNumber: number;
	toPay: Price;
	paymentId: ObjectId;
	expiresAt?: Date;
}): Promise<{
	checkoutId: string;
	meta: unknown;
	address: string;
	processor: PaymentProcessor;
	clientSecret?: string;
}> {
	if (isSumupEnabled()) {
		const resp = await fetch('https://api.sumup.com/v0.1/checkouts', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${runtimeConfig.sumUp.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				amount: toCurrency(
					runtimeConfig.sumUp.currency,
					params.toPay.amount,
					params.toPay.currency
				),
				currency: runtimeConfig.sumUp.currency,
				checkout_reference: params.orderId + '-' + params.paymentId,
				merchant_code: runtimeConfig.sumUp.merchantCode,
				redirect_url: `${ORIGIN}/order/${params.orderId}`,
				description: 'Order ' + params.orderNumber,
				...(params.expiresAt && {
					valid_until: params.expiresAt.toISOString()
				})
			}),
			...{ autoSelectFamily: true }
		});

		if (!resp.ok) {
			console.error(await resp.text());
			throw error(402, 'Sumup checkout creation failed');
		}

		const json = await resp.json();

		const checkoutId = json.id;

		if (!checkoutId || typeof checkoutId !== 'string') {
			console.error('no checkout id', json);
			throw error(402, 'Sumup checkout creation failed');
		}

		return {
			checkoutId,
			meta: json,
			address: `${ORIGIN}/order/${params.orderId}/payment/${params.paymentId}/pay`,
			processor: 'sumup'
		};
	}

	if (isStripeEnabled()) {
		// Create payment intent
		const response = await fetch('https://api.stripe.com/v1/payment_intents', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${runtimeConfig.stripe.secretKey}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: toUrlEncoded({
				amount: Math.round(
					toCurrency(runtimeConfig.stripe.currency, params.toPay.amount, params.toPay.currency) /
						CURRENCY_UNIT[runtimeConfig.stripe.currency]
				),
				currency: runtimeConfig.stripe.currency.toLowerCase(),
				automatic_payment_methods: {
					enabled: true
				},
				metadata: {
					orderId: params.orderId,
					paymentId: params.paymentId.toHexString()
				},
				description: 'Order ' + params.orderNumber
			})
		});

		if (!response.ok) {
			console.error(await response.text());
			throw error(402, 'Stripe payment intent creation failed');
		}

		const json = await response.json();

		const clientSecret = json.client_secret;

		if (!clientSecret || typeof clientSecret !== 'string') {
			console.error('no client secret', json);
			throw error(402, 'Stripe payment intent creation failed');
		}

		const paymentId = json.id;

		if (!paymentId || typeof paymentId !== 'string') {
			console.error('no payment id', json);
			throw error(402, 'Stripe payment intent creation failed');
		}

		return {
			checkoutId: paymentId,
			clientSecret,
			meta: json,
			address: `${ORIGIN}/order/${params.orderId}/payment/${params.paymentId}/pay`,
			processor: 'stripe'
		};
	}

	if (isPaypalEnabled()) {
		return await generatePaypalPaymentInfo(params);
	}

	throw error(402, 'No card payment processor configured');
}

async function generatePaypalPaymentInfo(params: {
	orderId: string;
	orderNumber: number;
	toPay: Price;
	paymentId: ObjectId;
}): Promise<{
	checkoutId: string;
	meta: unknown;
	address: string;
	processor: PaymentProcessor;
}> {
	const response = await fetch(`${paypalApiOrigin()}/v2/checkout/orders`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${await paypalAccessToken()}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			intent: 'CAPTURE',
			purchase_units: [
				{
					amount: {
						currency_code: runtimeConfig.paypal.currency,
						value: toCurrency(
							runtimeConfig.paypal.currency,
							params.toPay.amount,
							params.toPay.currency
						).toFixed(FRACTION_DIGITS_PER_CURRENCY[runtimeConfig.paypal.currency])
					},
					description: 'Order ' + params.orderNumber
				}
			],
			application_context: {
				user_action: 'PAY_NOW',
				// No need to fill shipping information through PayPal
				shipping_preference: 'NO_SHIPPING',
				return_url: `${ORIGIN}/order/${params.orderId}`,
				cancel_url: `${ORIGIN}/order/${params.orderId}?paymentId=${params.paymentId}&cancel=true`
			}
		})
	});

	if (!response.ok) {
		console.error(await response.text());
		throw error(402, 'PayPal checkout creation failed');
	}

	const json: {
		id: string;
		links: Array<{ rel: string; href: string }>;
	} = await response.json();

	const checkoutId = json.id;

	if (!checkoutId || typeof checkoutId !== 'string') {
		console.error('no checkout id', json);
		throw error(402, 'PayPal checkout creation failed');
	}

	const approveLink = json.links.find((link) => link.rel === 'approve');

	if (!approveLink) {
		console.error('no approve link', json);
		throw error(402, 'PayPal checkout creation failed');
	}

	return {
		checkoutId,
		meta: json,
		address: approveLink.href,
		processor: 'paypal'
	};
}

function paymentMethodExpiration(paymentMethod: PaymentMethod, opts?: { paymentTimeout?: number }) {
	return paymentMethod === 'point-of-sale' || paymentMethod === 'bank-transfer'
		? undefined
		: paymentMethod === 'lightning' &&
		  isPhoenixdConfigured() &&
		  (opts?.paymentTimeout ?? runtimeConfig.desiredPaymentTimeout) > 60
		? addHours(new Date(), 1)
		: addMinutes(new Date(), opts?.paymentTimeout ?? runtimeConfig.desiredPaymentTimeout);
}

function paymentPrice(paymentMethod: PaymentMethod, price: Price): Price {
	switch (paymentMethod) {
		case 'point-of-sale':
		case 'free':
		case 'bank-transfer':
			return {
				amount: toCurrency(runtimeConfig.mainCurrency, price.amount, price.currency),
				currency: runtimeConfig.mainCurrency
			};
		case 'card':
			if (isSumupEnabled()) {
				return {
					amount: toCurrency(runtimeConfig.sumUp.currency, price.amount, price.currency),
					currency: runtimeConfig.sumUp.currency
				};
			}

			if (isStripeEnabled()) {
				return {
					amount: toCurrency(runtimeConfig.stripe.currency, price.amount, price.currency),
					currency: runtimeConfig.stripe.currency
				};
			}

			if (isPaypalEnabled()) {
				return {
					amount: toCurrency(runtimeConfig.paypal.currency, price.amount, price.currency),
					currency: runtimeConfig.paypal.currency
				};
			}

			throw error(402, 'No card payment processor configured');
		case 'paypal':
			return {
				amount: toCurrency(runtimeConfig.paypal.currency, price.amount, price.currency),
				currency: runtimeConfig.paypal.currency
			};
		case 'bitcoin':
			return {
				amount: toCurrency('BTC', price.amount, price.currency),
				currency: 'BTC'
			};
		case 'lightning':
			return {
				amount: toCurrency('SAT', price.amount, price.currency),
				currency: 'SAT'
			};
	}
}

export async function addOrderPayment(
	order: Order,
	paymentMethod: PaymentMethod,
	price: Price,
	/**
	 * `null` expiresAt means the payment method has no expiration
	 */
	opts?: { expiresAt?: Date | null; session?: ClientSession }
) {
	if (order.status !== 'pending') {
		throw error(400, 'Order is not pending');
	}

	if (paymentMethod !== 'free' && isOrderFullyPaid(order, { includePendingOrders: true })) {
		throw error(400, 'Order already fully paid with pending payments');
	}

	// We reuse the same currencies as previous payments
	const mainCurrency = order.currencySnapshot.main.totalPrice.currency;
	const secondaryCurrency = order.currencySnapshot.secondary?.totalPrice.currency;
	const priceReferenceCurrency = order.currencySnapshot.priceReference.totalPrice.currency;
	const accountingCurrency = order.currencySnapshot.accounting?.totalPrice.currency;

	const priceToPay =
		toCurrency(mainCurrency, price.amount, price.currency) <=
		orderAmountWithNoPaymentsCreated(order)
			? price
			: {
					amount: orderAmountWithNoPaymentsCreated(order),
					currency: mainCurrency
			  };

	if (paymentMethod !== 'free' && priceToPay.amount < CURRENCY_UNIT[priceToPay.currency]) {
		throw error(400, 'Order already fully paid with pending payments');
	}

	const paymentId = new ObjectId();
	const expiresAt =
		opts?.expiresAt !== undefined ? opts.expiresAt : paymentMethodExpiration(paymentMethod);

	const payment: OrderPayment = {
		_id: paymentId,
		status: 'pending',
		method: paymentMethod,
		price: paymentPrice(paymentMethod, priceToPay),
		currencySnapshot: {
			main: {
				price: {
					amount: toCurrency(mainCurrency, priceToPay.amount, priceToPay.currency),
					currency: mainCurrency
				}
			},
			...(secondaryCurrency && {
				secondary: {
					price: {
						amount: toCurrency(secondaryCurrency, priceToPay.amount, priceToPay.currency),
						currency: secondaryCurrency
					}
				}
			}),
			...(accountingCurrency && {
				accounting: {
					price: {
						amount: toCurrency(accountingCurrency, priceToPay.amount, priceToPay.currency),
						currency: accountingCurrency
					}
				}
			}),
			priceReference: {
				price: {
					amount: toCurrency(priceReferenceCurrency, priceToPay.amount, priceToPay.currency),
					currency: priceReferenceCurrency
				}
			}
		},
		...(expiresAt && { expiresAt }),
		...(await generatePaymentInfo({
			method: paymentMethod,
			orderId: order._id,
			orderNumber: order.number,
			toPay: priceToPay,
			paymentId,
			expiresAt: expiresAt ?? undefined
		})),
		createdAt: new Date()
	};

	await collections.orders.updateOne(
		{ _id: order._id },
		{
			$push: {
				payments: payment
			}
		},
		{ session: opts?.session }
	);

	return payment;
}

export async function updateAfterOrderPaid(order: Order, session: ClientSession) {
	// #region subscriptions
	const subscriptions = await collections.paidSubscriptions
		.find({
			...userQuery(order.user),
			productId: { $in: order.items.map((item) => item.product._id) }
		})
		.toArray();
	for (const subscription of order.items.filter((item) => item.product.type === 'subscription')) {
		const existingSubscription = subscriptions.find(
			(sub) => sub.productId === subscription.product._id
		);

		if (existingSubscription) {
			const result = await collections.paidSubscriptions.updateOne(
				{ _id: existingSubscription._id },
				{
					$set: {
						paidUntil: add(max([existingSubscription.paidUntil, new Date()]), {
							[`${runtimeConfig.subscriptionDuration}s`]: 1
						}),
						updatedAt: new Date(),
						notifications: []
					},
					$unset: { cancelledAt: 1 }
				},
				{ session }
			);

			if (!result.modifiedCount) {
				throw new Error('Failed to update subscription');
			}
		} else {
			await collections.paidSubscriptions.insertOne(
				{
					_id: crypto.randomUUID(),
					number: await generateSubscriptionNumber(),
					user: order.user,
					productId: subscription.product._id,
					paidUntil: add(new Date(), { [`${runtimeConfig.subscriptionDuration}s`]: 1 }),
					createdAt: new Date(),
					updatedAt: new Date(),
					notifications: []
				},
				{ session }
			);
		}
	}
	//#endregion

	//#region challenges
	const challenges = await collections.challenges
		.find({
			beginsAt: { $lt: new Date() },
			endsAt: { $gt: new Date() }
		})
		.toArray();
	for (const challenge of challenges) {
		const productIds = new Set(challenge.productIds);
		const items = productIds.size
			? order.items.filter((item) => productIds.has(item.product._id))
			: order.items;
		const increase =
			challenge.mode === 'totalProducts'
				? sum(items.map((item) => item.quantity))
				: sumCurrency(
						challenge.goal.currency,
						items.map((item) => ({
							amount: (item.customPrice?.amount || item.product.price.amount) * item.quantity,
							currency: item.customPrice?.currency || item.product.price.currency
						}))
				  );
		if (increase > 0) {
			await collections.challenges.updateOne(
				{ _id: challenge._id },
				{
					$inc: { progress: increase },
					$push: {
						event: {
							type: 'progress',
							at: new Date(),
							order: order._id,
							amount: increase
						}
					}
				},
				{ session }
			);
		}
		if (items.length) {
			await queueEmail(
				runtimeConfig.sellerIdentity?.contact.email || SMTP_USER,
				'order.update.challenge',
				{
					challengeName: challenge.name,
					orderNumber: `${order.number}`,
					orderLink: `${ORIGIN}/order/${order._id}`,
					itemsChallenge: `${items
						.map(
							(item) =>
								`- ${item.product.name} - price ${
									item.customPrice?.amount || item.product.price.amount
								} ${item.customPrice?.currency || item.product.price.currency} - qty ${
									item.quantity
								} - total addition to challenge: ${
									challenge.mode === 'totalProducts'
										? item.quantity
										: (item.customPrice?.amount || item.product.price.amount) * item.quantity
								}`
						)
						.join('\n')}`,
					increase: `${increase}`,
					challengeLevel: `${challenge.progress}`
				}
			);
		}
	}
	//#endregion
	//#region leaderboard
	const leaderboards = await collections.leaderboards
		.find({
			beginsAt: { $lt: new Date() },
			endsAt: { $gt: new Date() }
		})
		.toArray();
	for (const leaderboard of leaderboards) {
		const productIds = new Set(leaderboard.productIds);
		const items = order.items.filter((item) => productIds.has(item.product._id));
		for (const item of items) {
			const increase =
				leaderboard.mode === 'totalProducts'
					? item.quantity
					: toCurrency(
							leaderboard.progress[0].currency || 'SAT',
							(item.customPrice?.amount || item.product.price.amount) * item.quantity,
							item.customPrice?.currency || item.product.price.currency
					  );
			await collections.leaderboards.updateOne(
				{ _id: leaderboard._id, 'progress.productId': item.product._id },
				{
					$inc: { 'progress.$.amount': increase },
					$push: {
						event: {
							type: 'progress',
							at: new Date(),
							orderId: order._id,
							amount: increase,
							productId: item.product._id
						}
					}
				},
				{ session }
			);
		}
		if (items.length) {
			await queueEmail(
				runtimeConfig.sellerIdentity?.contact.email || SMTP_USER,
				'order.update.leaderboard',
				{
					leaderboardName: leaderboard.name,
					orderNumber: `${order.number}`,
					orderLink: `${ORIGIN}/order/${order._id}`,
					itemsLeaderboard: `${items
						.map(
							(item) =>
								`- ${item.product.name} - price ${
									item.customPrice?.amount || item.product.price.amount
								} ${item.customPrice?.currency || item.product.price.currency} - qty ${
									item.quantity
								} - total addition to leaderboard: ${
									leaderboard.mode === 'totalProducts'
										? item.quantity
										: (item.customPrice?.amount || item.product.price.amount) * item.quantity
								}`
						)
						.join('\n')}`
				}
			);
		}
	}
	//#endregion
	//#region tickets
	let i = 0;
	for (const item of order.items) {
		if (item.product.isTicket) {
			const tickets = Array.from({ length: item.quantity }).map(() => ({
				_id: new ObjectId(),
				ticketId: crypto.randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
				orderId: order._id,
				productId: item.product._id,
				user: order.user
			}));

			await collections.tickets.insertMany(tickets, { session });
			await collections.orders.updateOne(
				{
					_id: order._id
				},
				{
					$set: {
						[`items.${i}.tickets`]: tickets.map((ticket) => ticket.ticketId)
					}
				},
				{ session }
			);
		}
		i++;
	}
	//#endregion

	// Update product stock in DB
	for (const item of order.items.filter((item) => item.product.stock)) {
		await collections.products.updateOne(
			{
				_id: item.product._id
			},
			{
				$inc: { 'stock.total': -item.quantity, 'stock.available': -item.quantity },
				$set: { updatedAt: new Date() }
			},
			{ session }
		);
	}
}
