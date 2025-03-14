import type { Product } from './Product';
import type { Currency } from './Currency';
import type { CountryAlpha2 } from './Country';
import type { Timestamps } from './Timestamps';
import type { UserIdentifier } from './UserIdentifier';
import type { SellerIdentity } from './SellerIdentity';
import type { PaymentMethod, PaymentProcessor } from '$lib/server/payment-methods';
import type { ObjectId } from 'mongodb';
import { sumCurrency } from '$lib/utils/sumCurrency';
import type { LanguageKey } from '$lib/translations';
import type { User } from './User';
import { getWeek, getWeekOfMonth } from 'date-fns';
import type { Ticket } from './Ticket';
import type { OrderLabel } from './OrderLabel';
import { toBitcoins } from '$lib/utils/toBitcoins';

export type OrderPaymentStatus = 'pending' | 'paid' | 'expired' | 'canceled' | 'failed';

export type DiscountType = 'fiat' | 'percentage';

export type Price = {
	amount: number;
	currency: Currency;
};

export interface Note {
	npub?: string;
	email?: string;
	userId?: User['_id'];
	userAlias?: string;
	role: string; // CUSTOMER_ROLE_ID or other
	content: string;
	createdAt: Date;
}

export interface OrderPayment {
	_id: ObjectId;
	status: OrderPaymentStatus;
	price: Price;
	/**
	 * Info may not always be available, for card payments for example.
	 */
	fees?: Price;
	/**
	 * Amount actually received for crypto payments.
	 *
	 * For other payment methods, this is the same as price.
	 */
	received?: Price;
	currencySnapshot: {
		main: {
			price: Price;
			received?: Price;
			fees?: Price;
			previouslyPaid?: Price;
			remainingToPay?: Price;
		};
		priceReference: {
			price: Price;
			received?: Price;
			fees?: Price;
			previouslyPaid?: Price;
			remainingToPay?: Price;
		};
		secondary?: {
			price: Price;
			received?: Price;
			fees?: Price;
			previouslyPaid?: Price;
			remainingToPay?: Price;
		};
		accounting?: {
			price: Price;
			received?: Price;
			fees?: Price;
			previouslyPaid?: Price;
			remainingToPay?: Price;
		};
	};
	method: PaymentMethod;
	processor?: PaymentProcessor;
	/**
	 * Can be unset for cash or bank transfer payments for example.
	 */
	expiresAt?: Date;
	/** Bitcoin / LN address, payment link */
	address?: string;
	paidAt?: Date;
	createdAt?: Date;
	/** For lightning addresses, contains the hash to look up the invoice */
	invoiceId?: string;
	/** For card transactions */
	checkoutId?: string;
	clientSecret?: string;
	/** For bitcoin transactions */
	wallet?: string;
	label?: string;
	/**
	 * There are also additional fields for sumup, they are stored but not documented here.
	 */
	transactions?: Array<{
		id: string;
		amount: number;
		currency: Currency;
		transaction_code?: string;
		txid?: string;
	}>;

	/**
	 * The invoice number, set when the order is paid.
	 */
	invoice?: {
		number: number;
		createdAt: Date;
	};

	lastStatusNotified?: OrderPaymentStatus;
	bankTransferNumber?: string;
	detail?: string;
}

export const FAKE_ORDER_INVOICE_NUMBER = -1;

export interface OrderAddress {
	firstName: string;
	lastName: string;
	address: string;
	city: string;
	state?: string;
	zip: string;
	country: CountryAlpha2;
	isCompany?: boolean;
	companyName?: string;
	vatNumber?: string;
	phone?: string;
}

export interface Order extends Timestamps {
	/**
	 * A string - a crypto UUID. Anyone having access to the _id can access the order.
	 */
	_id: string;

	number: number;
	locale: LanguageKey;

	items: Array<{
		product: Product;
		quantity: number;
		customPrice?: { amount: number; currency: Currency };
		chosenVariations?: Record<string, string>;
		depositPercentage?: number;
		currencySnapshot: {
			main: {
				price: Price;
				customPrice?: Price;
			};
			priceReference: {
				price: Price;
				customPrice?: Price;
			};
			secondary?: {
				price: Price;
				customPrice?: Price;
			};
			accounting?: {
				price: Price;
				customPrice?: Price;
			};
		};
		vatRate: number;
		tickets?: Array<Ticket['ticketId']>;
	}>;

	shippingAddress?: OrderAddress;
	billingAddress?: OrderAddress;
	shippingPrice?: {
		amount: number;
		currency: Currency;
	};

	vat?: Array<{
		price: Price;
		rate: number;
		country: CountryAlpha2;
	}>;

	vatFree?: {
		reason: string;
	};
	deliveryFeesFree?: {
		reason: string;
	};

	currencySnapshot: {
		main: {
			totalPrice: Price;
			totalReceived?: Price;
			vat?: Price[];
			shippingPrice?: Price;
			discount?: Price;
		};
		priceReference: {
			totalPrice: Price;
			totalReceived?: Price;
			vat?: Price[];
			shippingPrice?: Price;
			discount?: Price;
		};
		secondary?: {
			totalPrice: Price;
			totalReceived?: Price;
			vat?: Price[];
			shippingPrice?: Price;
			discount?: Price;
		};
		accounting?: {
			totalPrice: Price;
			totalReceived?: Price;
			vat?: Price[];
			shippingPrice?: Price;
			discount?: Price;
		};
	};

	/**
	 * Global status, in case multiple payments are required for the order.
	 */
	status: OrderPaymentStatus;

	payments: OrderPayment[];

	sellerIdentity: SellerIdentity | null;

	notifications: {
		paymentStatus: {
			// One of these two must be set
			npub?: string;
			email?: string;
		};
	};

	user: UserIdentifier;

	discount?: {
		justification: string;
		type: DiscountType;
		price: Price;
	};

	clientIp?: string;
	notes?: Note[];
	receiptNote?: string;
	onLocation?: boolean;
	engagements?: {
		acceptedTermsOfUse?: boolean;
		acceptedIPCollect?: boolean;
		acceptedDepositConditionsAndFullPayment?: boolean;
		acceptedExportationAndVATObligation?: boolean;
	};
	orderLabelIds?: OrderLabel['_id'][];
}
interface SimplifiedOrderPayment {
	id: string;
	method: PaymentMethod;
	status: OrderPaymentStatus;
}
interface SimplifiedOrderNotes {
	content: string;
	createdAt: Date;
}
export type SimplifiedOrder = Omit<Order, 'payments' | 'notes'> & {
	payments: SimplifiedOrderPayment[];
	notes: SimplifiedOrderNotes[];
};

export function orderAmountWithNoPaymentsCreated(
	order: Pick<Order, 'currencySnapshot'> & {
		payments: Pick<OrderPayment, 'currencySnapshot' | 'status'>[];
	}
): number {
	return sumCurrency(order.currencySnapshot.main.totalPrice.currency, [
		{
			amount: order.currencySnapshot.main.totalPrice.amount,
			currency: order.currencySnapshot.main.totalPrice.currency
		},
		...order.payments
			.filter((payment) => payment.status === 'pending' || payment.status === 'paid')
			.map((payment) => ({
				amount: -payment.currencySnapshot.main.price.amount,
				currency: payment.currencySnapshot.main.price.currency
			}))
	]);
}

export function orderRemainingToPay(
	order: Pick<Order, 'currencySnapshot'> & {
		payments: Pick<OrderPayment, 'currencySnapshot' | 'status'>[];
	}
): number {
	return sumCurrency(order.currencySnapshot.main.totalPrice.currency, [
		{
			amount: order.currencySnapshot.main.totalPrice.amount,
			currency: order.currencySnapshot.main.totalPrice.currency
		},
		...order.payments
			.filter((payment) => payment.status === 'paid')
			.map((payment) => ({
				amount: -payment.currencySnapshot.main.price.amount,
				currency: payment.currencySnapshot.main.price.currency
			}))
	]);
}

export const PAYMENT_METHOD_EMOJI: Record<PaymentMethod, string> = {
	'bank-transfer': '🏦',
	card: '💳',
	paypal: '🅿',
	'point-of-sale': '🛒',
	lightning: '⚡',
	bitcoin: '₿',
	free: '🆓'
};

export const ORDER_PAGINATION_LIMIT = 50;
export const MIN_SATOSHIS_FOR_BITCOIN_PAYMENT = 10_000;

export function invoiceNumberVariables(
	order: Pick<Order, 'number' | 'createdAt'> & { payments: { id: string }[] },
	payment: Pick<OrderPayment, 'createdAt' | 'paidAt' | 'status'> & {
		id: string;
		invoice?: { number: number };
	}
) {
	const dates = {
		order: order.createdAt,
		payment: payment.createdAt,
		paymentPaid: payment.paidAt,
		paymentPaidOrCreated: payment.paidAt ?? payment.createdAt
	};

	function dateVars<T extends string>(
		prefix: T,
		date: Date
	): {
		[P in
			| `${T}Year`
			| `${T}Month`
			| `${T}Week`
			| `${T}WeekOfMonth`
			| `${T}DayOfWeek`
			| `${T}DayOfMonth`]: string;
	} {
		return {
			[`${prefix}Year`]: date.getFullYear().toString(),
			[`${prefix}Month`]: String(date.getMonth() + 1).padStart(2, '0'),
			[`${prefix}Week`]: getWeek(date).toString().padStart(2, '0'),
			[`${prefix}WeekOfMonth`]: getWeekOfMonth(date).toString(),
			[`${prefix}DayOfWeek`]: (date.getDay() + 1).toString(),
			[`${prefix}DayOfMonth`]: date.getDate().toString().padStart(2, '0')
		} as {
			[P in
				| `${T}Year`
				| `${T}Month`
				| `${T}Week`
				| `${T}WeekOfMonth`
				| `${T}DayOfWeek`
				| `${T}DayOfMonth`]: string;
		};
	}

	return {
		orderNumber: order.number,
		paymentIndex: order.payments.findIndex((p) => p.id === payment.id) + 1,
		invoiceNumber: payment.invoice?.number?.toString(),
		...(dates.order && dateVars('order', dates.order)),
		...(dates.payment && dateVars('payment', dates.payment)),
		...(dates.paymentPaid && dateVars('paymentPaid', dates.paymentPaid)),
		...(dates.paymentPaidOrCreated && dateVars('paymentDynamic', dates.paymentPaidOrCreated))
	};
}

export function bitcoinPaymentQrCodeString(
	paymentAddress: string,
	paymentAmount: number,
	paymentCurrency: Currency
) {
	return `bitcoin:${paymentAddress}?amount=${toBitcoins(paymentAmount, paymentCurrency)
		.toLocaleString('en-US', { maximumFractionDigits: 8 })
		.replaceAll(',', '')}`;
}

export function lightningPaymentQrCodeString(paymentAddress: string) {
	return `lightning:${paymentAddress}`;
}
