import type { Product } from './Product';
import type { Currency } from './Currency';
import type { CountryAlpha2 } from './Country';
import type { Timestamps } from './Timestamps';

export type OrderPaymentStatus = 'pending' | 'paid' | 'expired' | 'canceled';

export interface Order extends Timestamps {
	/**
	 * A string - a crypto UUID. Anyone having access to the _id can access the order.
	 */
	_id: string;
	sessionId?: string;

	number: number;

	items: Array<{
		product: Product;
		quantity: number;
	}>;

	shippingAddress?: {
		firstName: string;
		lastName: string;
		address: string;
		city: string;
		state?: string;
		zip: string;
		country: CountryAlpha2;
	};

	shippingPrice?: {
		amount: number;
		currency: Currency;
	};

	totalPrice: {
		amount: number;
		currency: Currency;
	};

	payment: {
		method: 'bitcoin' | 'lightning' | 'cash';
		status: OrderPaymentStatus;
		expiresAt: Date;
		/** Bitcoin / LN address */
		address?: string;
		paidAt?: Date;
		totalReceived?: number;
		/** For lightning addresses, contains the hash to look up the invoice */
		invoiceId?: string;
		/** For bitcoin transactions */
		wallet?: string;
		transactions?: Array<{ txid: string; amount: number }>;
	};

	notifications: {
		paymentStatus: {
			// One of these two must be set
			npub?: string;
			email?: string;
		};
	};

	lastPaymentStatusNotified?: OrderPaymentStatus;
}
