import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES } from '$lib/types/Currency';
import { typedInclude } from '$lib/utils/typedIncludes';
import { differenceInMinutes } from 'date-fns';
import { lightningLabel, LIGHTNING } from '$lib/server/sdk/contrib/presentations';
import {
	definePaymentProcessor,
	type CreatePaymentParams,
	type CreatePaymentResult,
	type CheckPaymentResult
} from '$lib/server/sdk/pp';
import type { Order } from '$lib/types/Order';
import declaration from './declaration';

const apiUrl = () => 'https://api.swiss-bitcoin-pay.ch';

interface CheckoutRequest {
	title: string;
	description?: string;
	amount: number;
	unit?: string;
	delay?: number;
	onChain?: boolean;
	webhook?: {
		url: string;
	};
	extra?: {
		customNote?: string;
		customDevice?: string;
	};
}

interface CheckoutResponse {
	id: string;
	/// The lightning receipt to display to the user.
	pr: string;
	checkoutUrl: string;
	onChainAddr?: string;
}

interface CheckoutStatus {
	createdAt: number;
	delay: number;
	pr: string;
	amount: number;
	btcAmount: string;
	unit: string;
	isPaid: boolean;
	isInit: boolean;
	isExpired: boolean;
	paymentMethod?: 'lightning' | 'onchain';
	paidAt?: number;
	title: string;
	description?: string;
	hash: string;
	fiatAmount: number;
	fiatUnit: string;
	onChainAddr?: string;
	minConfirmations?: number;
	confirmations?: number;
	txid?: string;
	idPending?: boolean;
	redirectAfterPaid?: string;
}

/**
 * Swiss Bitcoin Pay's HTTP API can hang for several minutes on bad credentials or
 * network blips — there is no SDK-level timeout. We enforce one here so the customer
 * checkout (and the admin "test connection" button) fail fast instead of stalling
 * behind a reverse-proxy 5xx (see #2546).
 */
const SBP_HTTP_TIMEOUT_MS = 15_000;

async function sbpCreateCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
	if (!runtimeConfig.swissBitcoinPay.apiKey) {
		throw new Error('Swiss Bitcoin Pay is not enabled');
	}

	const response = await fetch(`${apiUrl()}/checkout`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'api-key': runtimeConfig.swissBitcoinPay.apiKey,
			'user-agent': `be-BOP`
		},
		body: JSON.stringify(request),
		signal: AbortSignal.timeout(SBP_HTTP_TIMEOUT_MS)
	});

	if (!response.ok) {
		throw new Error(`Failed to create checkout: ${response.status} ${response.statusText}`);
	}
	return await response.json();
}

async function sbpGetCheckoutStatus(id: string): Promise<CheckoutStatus> {
	const response = await fetch(`${apiUrl()}/checkout/${id}`, {
		method: 'GET',
		signal: AbortSignal.timeout(SBP_HTTP_TIMEOUT_MS)
	});

	if (!response.ok) {
		throw new Error(
			`Failed to get Swiss Bitcoin Pay checkout ${id}: ${response.status} ${response.statusText}`
		);
	}

	return await response.json();
}

export default definePaymentProcessor(declaration, {
	...LIGHTNING,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = params.toPay.amount;
		const label = lightningLabel(params.orderId, params.orderNumber);
		const checkout = await sbpCreateCheckout({
			title: label,
			description: `Order #${params.orderNumber}`,
			amount: satoshis,
			unit: 'sat',
			extra: { customDevice: runtimeConfig.brandName },
			...(params.expiresAt && {
				delay: differenceInMinutes(params.expiresAt, new Date())
			})
		});
		return {
			address: checkout.pr,
			invoiceId: checkout.id,
			processor: 'swiss-bitcoin-pay'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			throw new Error('Missing invoice ID on swiss-bitcoin-pay payment');
		}
		const status = await sbpGetCheckoutStatus(payment.invoiceId);
		if (status.isPaid) {
			let currency = status.unit?.toUpperCase();
			let amount = status.amount;
			// Workaround: undocumented behaviour in Swiss Bitcoin Pay
			if (currency === undefined && status.fiatUnit === 'sat') {
				currency = 'SAT';
				amount = status.fiatAmount;
			}
			if (!typedInclude(CURRENCIES, currency)) {
				throw new Error(`SBP invoice ${payment.invoiceId} paid in unexpected currency ${currency}`);
			}
			return { status: 'paid', received: { amount, currency } };
		}
		if (status.isExpired) {
			return { status: 'expired' };
		}
		return { status: 'pending' };
	}
});
