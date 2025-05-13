import { runtimeConfig } from './runtime-config';

const apiUrl = () => 'https://api.swiss-bitcoin-pay.ch';

export function isSwissBitcoinPayConfigured() {
	return !!runtimeConfig.swissBitcoinPay?.apiKey;
}

export interface CheckoutRequest {
	title: string;
	description?: string;
	amount: number;
	unit?: string;
	onChain?: boolean;
	webhook?: {
		url: string;
	};
	extra?: {
		customNote?: string;
		customDevice?: string;
	};
}

export interface CheckoutResponse {
	id: string;
	/// The lightning receipt to display to the user.
	pr: string;
	checkoutUrl: string;
	onChainAddr?: string;
}

export interface CheckoutStatus {
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

export async function sbpCreateCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
	if (!isSwissBitcoinPayConfigured()) {
		throw new Error('Swiss Bitcoin Pay is not enabled');
	}

	const response = await fetch(`${apiUrl()}/checkout`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'api-key': runtimeConfig.swissBitcoinPay.apiKey,
			'user-agent': `be-BOP`
		},
		body: JSON.stringify(request)
	});

	if (!response.ok) {
		throw new Error(`Failed to create checkout: ${response.status} ${response.statusText}`);
	}
	return await response.json();
}

export async function sbpGetCheckoutStatus(id: string): Promise<CheckoutStatus> {
	const response = await fetch(`${apiUrl()}/checkout/${id}`, {
		method: 'GET'
	});

	if (!response.ok) {
		throw new Error(
			`Failed to get Swiss Bitcoin Pay checkout ${id}: ${response.status} ${response.statusText}`
		);
	}

	return await response.json();
}
