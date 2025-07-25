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
import {
	Duration,
	add,
	addHours,
	addMinutes,
	differenceInMinutes,
	differenceInSeconds,
	endOfDay,
	isSameDay,
	max,
	startOfDay,
	subSeconds
} from 'date-fns';
import { runtimeConfig } from './runtime-config';
import { freeProductsForUser, generateSubscriptionNumber } from './subscriptions';
import {
	checkProductVariationsIntegrity,
	productPriceWithVariations,
	type Product
} from '$lib/types/Product';
import { error } from '@sveltejs/kit';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { currentWallet, getNewAddress, orderAddressLabel } from './bitcoind';
import { isLndConfigured, lndCreateInvoice } from './lnd';
import { ORIGIN } from '$lib/server/env-config';
import { emailsEnabled, queueEmail } from './email';
import { sum } from '$lib/utils/sum';
import { type Cart } from '$lib/types/Cart';
import { computeDeliveryFees, computePriceInfo } from '$lib/cart';
import { CURRENCY_UNIT, FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import { sumCurrency } from '$lib/utils/sumCurrency';
import { refreshAvailableStockInDb } from './product';
import { checkCartItems } from './cart';
import { userQuery } from './user';
import { SMTP_USER } from '$lib/server/env-config';
import { toCurrency } from '$lib/utils/toCurrency';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import type { PaymentMethod, PaymentProcessor } from './payment-methods';
import type { CountryAlpha2 } from '$lib/types/Country';
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
import type { Discount } from '$lib/types/Discount';
import { groupByNonPartial } from '$lib/utils/group-by';
import {
	dayList,
	minutesToTime,
	productToScheduleId,
	scheduleToProductId,
	timeToMinutes,
	type Schedule,
	type ScheduleEvent
} from '$lib/types/Schedule';
import { isEmptyObject } from '$lib/utils/is-empty-object';
import { binaryFindAround } from '$lib/utils/binary-find';
import { toZonedTime } from 'date-fns-tz';
import { isSwissBitcoinPayConfigured, sbpCreateCheckout } from './swiss-bitcoin-pay';
import type { PaidSubscription } from '$lib/types/PaidSubscription';
import { btcpayCreateLnInvoice, isBtcpayServerConfigured } from './btcpay-server';

export async function conflictingTapToPayOrder(orderId: string): Promise<string | null> {
	const other = await collections.orders.findOne({
		_id: { $ne: orderId },
		payments: {
			$elemMatch: {
				status: 'pending',
				method: 'point-of-sale',
				'posTapToPay.expiresAt': { $gt: new Date() }
			}
		}
	});
	if (other) {
		return other._id;
	}
	return null;
}

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
		tapToPay?: { expiresAt: Date };
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
					...(params?.tapToPay && {
						'payments.$.posTapToPay.expiresAt': params.tapToPay.expiresAt
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
									order.payments
										.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt < paidAt)
										.map((p) => p.currencySnapshot.secondary?.price)
										.filter((p) => p !== undefined)
								)
							},
							'payments.$.currencySnapshot.secondary.remainingToPay': {
								currency: payment.currencySnapshot.secondary.price.currency,
								amount: sumCurrency(payment.currencySnapshot.secondary.price.currency, [
									order.currencySnapshot.secondary.totalPrice,
									...order.payments
										.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt <= paidAt)
										.map((p) => p.currencySnapshot.secondary?.price)
										.filter((p) => p !== undefined)
										.map((p) => ({ currency: p.currency, amount: -p.amount }))
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
									order.payments
										.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt < paidAt)
										.map((p) => p.currencySnapshot.accounting?.price)
										.filter((p) => p !== undefined)
								)
							},
							'payments.$.currencySnapshot.accounting.remainingToPay': {
								currency: payment.currencySnapshot.accounting.price.currency,
								amount: sumCurrency(payment.currencySnapshot.accounting.price.currency, [
									order.currencySnapshot.accounting.totalPrice,
									...order.payments
										.filter((p) => p.status === 'paid' && p.paidAt && p.paidAt <= paidAt)
										.map((p) => p.currencySnapshot.accounting?.price)
										.filter((p) => p !== undefined)
										.map((p) => ({ currency: p.currency, amount: -p.amount }))
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
	reason: Extract<OrderPaymentStatus, 'canceled' | 'expired' | 'failed'>,
	opts?: { preserveOrderStatus?: boolean; session?: ClientSession }
): Promise<Order> {
	if (!order.payments.includes(payment)) {
		throw new Error('Sync broken between order and payment');
	}

	payment.status = reason; // for  below

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
					order.status === 'pending' &&
					!opts?.preserveOrderStatus && {
						status: reason
					})
			},
			$unset: {
				'payments.$.posTapToPay': 1
			}
		},
		{ returnDocument: 'after', session: opts?.session }
	);
	if (
		ret.value &&
		order.status !== ret.value.status &&
		(ret.value.status === 'canceled' ||
			ret.value.status === 'expired' ||
			ret.value.status === 'failed')
	) {
		for (const item of order.items) {
			if (item.freeProductSources?.length) {
				for (const source of item.freeProductSources) {
					await collections.paidSubscriptions.updateOne(
						{ _id: source.subscriptionId },
						{
							$inc: {
								[`freeProductsById.${item.product._id}.used`]: -source.quantity,
								[`freeProductsById.${item.product._id}.available`]: source.quantity
							},
							$set: {
								updatedAt: new Date()
							}
						},
						{ session: opts?.session }
					);
				}
			}
		}
	}
	if (!ret.value) {
		throw new Error('Failed to update order');
	}
	if (
		order.status !== ret.value.status &&
		(ret.value.status === 'canceled' ||
			ret.value.status === 'expired' ||
			ret.value.status === 'failed')
	) {
		await collections.scheduleEvents.updateMany(
			{
				orderId: order._id
			},
			{
				$set: {
					status: 'canceled'
				}
			}
		);
	}
	order = ret.value;

	return order;
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
		discountPercentage?: number;
		freeProductSources?: { subscriptionId: string; quantity: number }[];
		booking?: Cart['items'][0]['booking'] & { _id: ObjectId };
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
		session?: ClientSession;
	}
): Promise<Order['_id']> {
	const npubAddress = params.notifications?.paymentStatus?.npub;
	const email = params.notifications?.paymentStatus?.email;

	const canBeNotified = !!(
		npubAddress ||
		((runtimeConfig.contactModesForceOption || emailsEnabled) && email)
	);

	if (
		!canBeNotified &&
		paymentMethod !== 'point-of-sale' &&
		paymentMethod !== null &&
		!params.user.userHasPosOptions
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

	for (const item of items) {
		if (item.product.bookingSpec) {
			if (!item.booking) {
				throw error(
					400,
					`Product ${item.product.name} is a booking, please provide booking time and duration`
				);
			}
			if (item.booking.start <= new Date()) {
				throw error(400, `Product ${item.product.name} booking start time is in the past`);
			}
			if (item.booking.end <= item.booking.start) {
				throw error(400, `Product ${item.product.name} booking end time is before start time`);
			}
			const durationMinutes = differenceInMinutes(item.booking.end, item.booking.start);

			if (durationMinutes < item.product.bookingSpec.slotMinutes) {
				throw error(
					400,
					`Product ${item.product.name} booking duration is less than the minimum duration of ${item.product.bookingSpec.slotMinutes} minutes`
				);
			}

			if (durationMinutes % item.product.bookingSpec.slotMinutes !== 0) {
				throw error(
					400,
					`Product ${item.product.name} booking duration is not a multiple of the slot duration of ${item.product.bookingSpec.slotMinutes} minutes`
				);
			}
		}
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
		params.user.userHasPosOptions && params?.discount?.amount ? params.discount : undefined;

	const vatProfiles = products.some((p) => p.vatProfileId)
		? await collections.vatProfiles
				.find({ _id: { $in: filterNullish(products.map((p) => p.vatProfileId)) } })
				.toArray()
		: [];

	const vatExempted = runtimeConfig.vatExempted || !!params.reasonFreeVat;

	const paidSubs = await collections.paidSubscriptions
		.find({
			...userQuery(params.user),
			paidUntil: { $gt: new Date() }
		})
		.toArray();
	const discounts = paidSubs.length
		? await collections.discounts
				.aggregate<{
					_id: Product['_id'] | null;
					discountPercent: number;
					subscriptionIds: Discount['subscriptionIds'];
				}>([
					{
						$match: {
							$or: [
								{ wholeCatalog: true },
								{ productIds: { $in: items.map((p) => p.product._id) } }
							],
							subscriptionIds: { $in: paidSubs.map((sub) => sub.productId) },
							beginsAt: {
								$lt: new Date()
							},
							mode: 'percentage',
							$and: [
								{
									$or: [
										{
											endsAt: { $gt: new Date() }
										},
										{
											endsAt: null
										}
									]
								}
							]
						}
					},
					{
						$sort: {
							percentage: -1
						}
					},
					{
						$project: {
							productIds: 1,
							percentage: 1,
							subscriptionIds: 1,
							_id: 0
						}
					},
					{
						$unwind: {
							path: '$productIds',
							preserveNullAndEmptyArrays: true
						}
					},
					{
						$unwind: {
							path: '$subscriptionIds',
							preserveNullAndEmptyArrays: false
						}
					},
					{
						$group: {
							_id: { $ifNull: ['$productIds', null] },
							discountPercent: { $first: '$percentage' },
							subscriptionIds: { $addToSet: '$subscriptionIds' }
						}
					}
				])
				.toArray()
		: [];

	const wholeDiscount = discounts.find((d) => d._id === null)?.discountPercent;
	const discountByProductId = new Map(
		discounts
			.filter((d) => d._id !== null)
			.map((d) => [
				d._id,
				wholeDiscount !== undefined && wholeDiscount > d.discountPercent
					? wholeDiscount
					: d.discountPercent
			])
	);

	const discountSubIds = new Set(discounts.flatMap((d) => d.subscriptionIds));
	const usedSubIds = paidSubs
		.filter((sub) => discountSubIds.has(sub.productId))
		.map((sub) => sub.productId);

	for (const item of items) {
		item.discountPercentage ??= discountByProductId.get(item.product._id) ?? wholeDiscount;
	}
	const priceInfo = computePriceInfo(items, {
		bebopCountry: runtimeConfig.vatCountry,
		deliveryFees: shippingPrice,
		discount: discountInfo,
		freeProductUnits: await freeProductsForUser(
			params.user,
			items.map((item) => item.product._id)
		),
		userCountry: params.userVatCountry,
		vatExempted,
		vatNullOutsideSellerCountry: runtimeConfig.vatNullOutsideSellerCountry,
		vatProfiles,
		vatSingleCountry: runtimeConfig.vatSingleCountry
	});

	for (const { item, price } of items.map((item, i) => ({ item, price: priceInfo.perItem[i] }))) {
		if (price.usedFreeUnits) {
			let quantityToConsume = price.usedFreeUnits;
			const freeProductSubscriptions = await collections.paidSubscriptions
				.find({
					...userQuery(params.user),
					[`freeProductsById.${item.product._id}.available`]: { $gt: 0 },
					paidUntil: { $gt: new Date() }
				})
				.sort({ createdAt: 1 })
				.toArray();
			const usedSources: { subscriptionId: string; quantity: number }[] = [];

			for (const sub of freeProductSubscriptions) {
				if (quantityToConsume <= 0) {
					break;
				}

				const subAvailable = sub.freeProductsById?.[item.product._id]?.available ?? 0;
				if (subAvailable <= 0) {
					continue;
				}

				const toUse = Math.min(quantityToConsume, subAvailable);
				quantityToConsume -= toUse;

				await collections.paidSubscriptions.updateOne(
					{ _id: sub._id },
					{
						$inc: {
							[`freeProductsById.${item.product._id}.used`]: toUse,
							[`freeProductsById.${item.product._id}.available`]: -toUse
						},
						$set: {
							updatedAt: new Date()
						}
					},
					{ session: params.session }
				);

				usedSources.push({ subscriptionId: sub._id, quantity: toUse });
			}
			item.freeProductSources = usedSources;
		}
	}
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
	if (priceInfo.discount && params.discount && params.user.userHasPosOptions) {
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
	const physicalCartMinAmount = runtimeConfig.physicalCartMinAmount;

	const physicalCartCanBeOrdered =
		!!physicalCartMinAmount && !isDigital
			? priceInfo.totalPriceWithVat >=
			  toCurrency(priceInfo.currency, physicalCartMinAmount, runtimeConfig.mainCurrency)
			: true;

	if (!physicalCartCanBeOrdered) {
		throw error(403, `Can't order a cart with amount < ${physicalCartMinAmount}`);
	}

	const bookingTimesPerProduct = groupByNonPartial(
		items
			.map((item) =>
				item.product.bookingSpec && item.booking !== undefined
					? {
							_id: item.booking._id,
							productId: item.product._id,
							start: item.booking.start,
							end: item.booking.end as Date | null
					  }
					: undefined
			)
			.filter((item) => item !== undefined),
		(item) => item.productId
	);

	const productById = Object.fromEntries(items.map((item) => [item.product._id, item.product]));

	if (!isEmptyObject(bookingTimesPerProduct)) {
		for (const [productId, times] of Object.entries(bookingTimesPerProduct)) {
			times.sort(compareBookingsAndThrow(productById[productId].name, false));

			for (const time of times) {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const bookingSpec = productById[productId].bookingSpec!;

				if (!time.end) {
					throw error(400, `Product ${productById[productId].name} booking end time is required`);
				}

				const startTime = toZonedTime(time.start, bookingSpec.schedule.timezone);
				const startDay = startOfDay(startTime.getDay() + 6);
				const endTime = toZonedTime(time.end, bookingSpec.schedule.timezone);
				const endDay = endOfDay(subSeconds(endTime, 1).getDay() + 6); // Sub-seconds to allow booking until midnight

				if (!isSameDay(startDay, endDay)) {
					throw error(
						400,
						`Product ${productById[productId].name} booking time range must be on the same day`
					);
				}

				const dayOfWeek = dayList[(startDay.getDay() + 6) % 7];

				const daySpec = bookingSpec.schedule[dayOfWeek];

				if (!daySpec) {
					throw error(
						400,
						`Product ${productById[productId].name} booking time range is not available on ${dayOfWeek}`
					);
				}

				const minutesStart = startTime.getMinutes() + startTime.getHours() * 60;
				const minutesEnd = endTime.getMinutes() + endTime.getHours() * 60;

				if (minutesStart < timeToMinutes(daySpec.start)) {
					throw error(
						400,
						`Product ${productById[productId].name} booking time range starts (${minutesToTime(
							minutesStart
						)}) before the scheduled opening time (${daySpec.start})`
					);
				}
				if (minutesEnd > (daySpec.end === '00:00' ? timeToMinutes(daySpec.end) : 24 * 60)) {
					throw error(
						400,
						`Product ${productById[productId].name} booking time range ends (${minutesToTime(
							minutesEnd
						)}) after the schedule closing time (${daySpec.end})`
					);
				}
			}
		}

		await Promise.all(
			Object.entries(bookingTimesPerProduct).map(async ([productId, times]) => {
				const lastTime = times[times.length - 1];
				const events = await collections.scheduleEvents
					.find({
						scheduleId: productToScheduleId(productId),
						...(lastTime.end && {
							beginsAt: {
								$lt: lastTime.end
							}
						}),
						$or: [
							{
								endsAt: { $exists: false }
							},
							{
								endsAt: { $gt: times[0].start }
							}
						],
						status: { $in: ['pending', 'confirmed'] }
					})
					.project<{
						_id: Schedule['_id'];
						isNew: boolean;
						start: ScheduleEvent['beginsAt'];
						end: NonNullable<ScheduleEvent['endsAt']> | null;
					}>({
						_id: { $literal: productId },
						start: '$beginsAt',
						end: { $ifNull: ['$endsAt', null] }
					})
					.toArray();

				for (const event of events) {
					binaryFindAround(
						bookingTimesPerProduct[productId],
						event,
						compareBookingsAndThrow(productById[productId].name, true)
					);
				}
			})
		);

		// Todo: optimize by filtering only events that are in the time range
		const schedules = await collections.schedules
			.find({
				_id: {
					$in: Object.keys(bookingTimesPerProduct).map((productId) =>
						productToScheduleId(productId)
					)
				}
			})
			.toArray();

		for (const schedule of schedules) {
			const existingBookings = bookingTimesPerProduct[scheduleToProductId(schedule._id)];

			for (const event of schedule.events.filter(
				(e) =>
					e.beginsAt <= (existingBookings[existingBookings.length - 1].end ?? Infinity) &&
					(e.endsAt ?? Infinity) >= existingBookings[0].start
			)) {
				binaryFindAround(
					existingBookings,
					{
						start: event.beginsAt,
						end: event.endsAt ?? null
					},
					compareBookingsAndThrow(productById[scheduleToProductId(schedule._id)].name, true)
				);
			}
		}

		await collections.scheduleEvents.insertMany(
			Object.entries(bookingTimesPerProduct).flatMap(([productId, bookings]) =>
				bookings.map((booking) => ({
					_id: booking._id,
					title: '#' + orderNumber + ' - ' + productById[productId].name,
					slug: productId + '-' + orderNumber,
					beginsAt: booking.start,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					endsAt: booking.end!,
					scheduleId: productToScheduleId(productId),
					orderId: orderId,
					status: 'pending',
					orderCreated: false
				}))
			)
		);
	}

	try {
		if (!isEmptyObject(bookingTimesPerProduct)) {
			// Refetch events to check for conflicts. If so, we'll throw, and it will delete the inserted events
			await Promise.all(
				Object.entries(bookingTimesPerProduct).map(async ([productId, times]) => {
					const lastTime = times[times.length - 1];
					const events = await collections.scheduleEvents
						.find({
							scheduleId: productToScheduleId(productId),
							status: { $in: ['pending', 'confirmed'] },
							...(lastTime.end && {
								beginsAt: {
									$lt: lastTime.end
								}
							}),
							$or: [
								{
									endsAt: { $exists: false }
								},
								{
									endsAt: { $gt: times[0].start }
								}
							],
							_id: {
								$nin: times.map((t) => t._id)
							}
						})
						.project<{
							_id: Schedule['_id'];
							isNew: boolean;
							start: ScheduleEvent['beginsAt'];
							end: NonNullable<ScheduleEvent['endsAt']> | null;
						}>({
							_id: { $literal: productId },
							start: '$beginsAt',
							end: { $ifNull: ['$endsAt', null] }
						})
						.toArray();

					for (const event of events) {
						binaryFindAround(
							bookingTimesPerProduct[productId],
							event,
							compareBookingsAndThrow(productById[productId].name, true)
						);
					}
				})
			);
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
					discountPercentage: item.discountPercentage,
					freeQuantity: priceInfo.perItem[i].usedFreeUnits,
					freeProductSources: item.freeProductSources,
					...(item.product.bookingSpec &&
						item.booking && {
							booking: { start: item.booking.start, end: item.booking.end, _id: item.booking._id }
						}),
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
				notes: [
					...(items.some((item) => item.discountPercentage)
						? [
								{
									content: `Discount applied: ${items
										.filter((item) => item.discountPercentage)
										.map(
											(item) =>
												`${item.product.name} (${item.product._id}): ${item.discountPercentage}%`
										)
										.join(', ')} because of subscription ${usedSubIds.join(', ')}`,
									createdAt: new Date(),
									role: null
								}
						  ]
						: []),
					...(params.note
						? [
								{
									content: params.note,
									createdAt: new Date(),
									role: params.user.userRoleId || CUSTOMER_ROLE_ID,
									...(params.user && { userId: params.user.userId }),
									...(npubAddress && { npub: npubAddress }),
									...(email && { email })
								}
						  ]
						: [])
				],
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
	} catch (e) {
		if (!isEmptyObject(bookingTimesPerProduct)) {
			await collections.scheduleEvents.deleteMany({
				_id: {
					$in: Object.values(bookingTimesPerProduct).flatMap((times) => times.map((t) => t._id))
				}
			});
		}
		throw e;
	}

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
			if (isSwissBitcoinPayConfigured()) {
				const invoice = await swissBitcoinPayCreateInvoice({
					label,
					orderId: `${params.orderNumber}`,
					expiresAt: params.expiresAt,
					toPay: {
						amount: satoshis,
						currency: 'SAT'
					}
				});
				return {
					address: invoice.payment_address,
					invoiceId: invoice.invoiceId,
					processor: 'swiss-bitcoin-pay'
				};
			} else if (isBtcpayServerConfigured()) {
				const invoice = await btcpayServerCreateInvoice({
					label,
					expiresAt: params.expiresAt,
					amountInSats: satoshis
				});
				return {
					address: invoice.payment_address,
					invoiceId: invoice.invoiceId,
					processor: 'btcpay-server'
				};
			} else if (isPhoenixdConfigured()) {
				// no way to configure an expiration date for now
				const invoice = await phoenixdCreateInvoice(satoshis, label, params.orderId);

				return {
					address: invoice.payment_address,
					invoiceId: invoice.r_hash,
					processor: 'phoenixd'
				};
			} else if (isLndConfigured()) {
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
			} else {
				throw new Error('No lightning payment processors available.');
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

export function paymentMethodExpiration(
	paymentMethod: PaymentMethod,
	opts?: { paymentTimeout?: number }
) {
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

/** Adds the free products of the specified discount to the specified accumulator */
function addDiscountFreeProducts(
	discount: Discount,
	freeProductsById: NonNullable<PaidSubscription['freeProductsById']>
) {
	if (discount.mode === 'freeProducts' && discount.quantityPerProduct) {
		for (const [productId, quantity] of Object.entries(discount.quantityPerProduct)) {
			if (!freeProductsById[productId]) {
				freeProductsById[productId] = { total: 0, available: 0, used: 0 };
			}
			freeProductsById[productId].total += quantity;
			freeProductsById[productId].available += quantity;
		}
	}
}

const subscriptionDuration: Duration = {
	hour: { hours: 1 },
	day: { days: 1 },
	month: { months: 1 }
}[runtimeConfig.subscriptionDuration] satisfies Duration;

async function applyOrderSubscriptionsDiscounts(order: Order, session: ClientSession) {
	const subscriptionProducts = order.items.filter((item) => item.product.type === 'subscription');
	const existingSubscriptions = await collections.paidSubscriptions
		.find({
			...userQuery(order.user),
			productId: { $in: order.items.map((item) => item.product._id) }
		})
		.toArray();
	const discounts = await collections.discounts
		.find({
			subscriptionIds: {
				$in: subscriptionProducts.map((sub) => sub.product._id)
			}
		})
		.toArray();
	for (const subscription of subscriptionProducts) {
		const discountsForSubscription = discounts.filter((discount) =>
			discount.productIds.includes(subscription.product._id)
		);
		const existing = existingSubscriptions.find(
			(sub) => sub.productId === subscription.product._id
		);
		if (existing) {
			const updatedFreeProductsById = structuredClone(existing.freeProductsById ?? {});
			for (const discount of discountsForSubscription) {
				addDiscountFreeProducts(discount, updatedFreeProductsById);
			}
			const result = await collections.paidSubscriptions.updateOne(
				{ _id: existing._id },
				{
					$set: {
						paidUntil: add(max([existing.paidUntil, new Date()]), subscriptionDuration),
						updatedAt: new Date(),
						notifications: [],
						...(Object.keys(updatedFreeProductsById).length !== 0 && {
							freeProductsById: updatedFreeProductsById
						})
					},
					$unset: { cancelledAt: 1 }
				},
				{ session }
			);
			if (!result.modifiedCount) {
				throw new Error('Failed to update subscription');
			}
		} else {
			const freeProductsById: PaidSubscription['freeProductsById'] = {};
			for (const discount of discountsForSubscription) {
				addDiscountFreeProducts(discount, freeProductsById);
			}
			await collections.paidSubscriptions.insertOne(
				{
					_id: crypto.randomUUID(),
					number: await generateSubscriptionNumber(),
					user: order.user,
					productId: subscription.product._id,
					paidUntil: add(new Date(), subscriptionDuration),
					createdAt: new Date(),
					updatedAt: new Date(),
					notifications: [],
					...(Object.keys(freeProductsById).length !== 0 && { freeProductsById })
				},
				{ session }
			);
		}
	}
}

export async function updateAfterOrderPaid(order: Order, session: ClientSession) {
	if (order.items.some((item) => item.product.type === 'subscription')) {
		await collections.scheduleEvents.updateMany(
			{ orderId: order._id },
			{ $set: { status: 'confirmed' } },
			{ session }
		);
		await applyOrderSubscriptionsDiscounts(order, session);
	}

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
							amount:
								(item.customPrice?.amount ?? item.product.price.amount) *
								item.quantity *
								(challenge.perProductRatio?.[item.product._id] ??
									(challenge.globalRatio ?? 100) / 100) *
								(item.discountPercentage ? (100 - item.discountPercentage) / 100 : 1),
							currency: item.customPrice?.currency ?? item.product.price.currency
						}))
				  );
		const incObject: Record<string, number> = {};
		if (challenge.mode === 'moneyAmount') {
			for (const item of items) {
				const amount =
					toCurrency(
						challenge.goal.currency,
						item.product.price.amount,
						item.product.price.currency
					) * (item.discountPercentage ? (100 - item.discountPercentage) / 100 : 1);

				const key = `amountPerProduct.${item.product._id}`;
				incObject[key] = (incObject[key] || 0) + amount;
			}
		}
		if (increase > 0) {
			await collections.challenges.updateOne(
				{ _id: challenge._id },
				{
					$inc: { progress: increase, ...incObject },
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
				},
				{ session }
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
				},
				{ session }
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

function compareBookingsAndThrow(
	productName: string,
	withOld: boolean
): (
	a: {
		start: Date;
		end?: Date | null;
	},
	b: { start: Date; end?: Date | null }
) => number {
	return (a, b) => {
		if (
			a.start.getTime() <= b.start.getTime() &&
			(a.end?.getTime() ?? Infinity) > b.start.getTime()
		) {
			throw error(
				400,
				`Product ${productName} has overlapping bookings ${
					!withOld ? 'in your order' : 'with an existing booking'
				}`
			);
		}

		if (
			b.start.getTime() <= a.start.getTime() &&
			(b.end?.getTime() ?? Infinity) > a.start.getTime()
		) {
			throw error(
				400,
				`Product ${productName} has overlapping bookings ${
					!withOld ? 'in your order' : 'with an existing booking'
				}`
			);
		}

		return a.start.getTime() - b.start.getTime();
	};
}

async function swissBitcoinPayCreateInvoice(params: {
	label: string;
	orderId: string;
	toPay: Price;
	expiresAt?: Date;
}): Promise<{
	payment_address: string;
	invoiceId: string;
}> {
	const accountingNote = `Order #${params.orderId}`;
	const device = runtimeConfig.brandName;
	try {
		const checkout = await sbpCreateCheckout({
			title: params.label,
			description: accountingNote,
			amount: params.toPay.amount,
			unit: params.toPay.currency === 'SAT' ? 'sat' : params.toPay.currency,
			extra: {
				customDevice: device
			},
			...(params.expiresAt === undefined
				? {}
				: { delay: differenceInMinutes(params.expiresAt, new Date()) })
		});
		const payment_address = checkout.pr;
		const invoiceId = checkout.id;
		return { payment_address, invoiceId };
	} catch (err) {
		throw error(402, `Failed to create Swiss Bitcoin Pay Invoice: ${err}`);
	}
}

async function btcpayServerCreateInvoice(params: {
	label: string;
	amountInSats: number;
	expiresAt?: Date;
}): Promise<{
	payment_address: string;
	invoiceId: string;
}> {
	try {
		const invoice = await btcpayCreateLnInvoice({
			amount: `${params.amountInSats * 1000}`,
			description: params.label,
			...(params.expiresAt === undefined
				? {}
				: {
						expiry: differenceInSeconds(params.expiresAt, new Date())
				  })
		});
		const payment_address = invoice.BOLT11;
		const invoiceId = invoice.id;
		return { payment_address, invoiceId };
	} catch (err) {
		throw error(402, `Failed to create BTCPay Server Invoice: ${err}`);
	}
}
