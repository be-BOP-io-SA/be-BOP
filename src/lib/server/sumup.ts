import { runtimeConfig } from './runtime-config';

export const isSumupEnabled = () =>
	!!runtimeConfig.sumUp.apiKey && !!runtimeConfig.sumUp.merchantCode;

export type SumUpCheckoutResponse = {
	status: 'PENDING' | 'PAID' | 'FAILED' | 'DECLINED';
	amount: number;
	currency: string;
	transactions?: {
		id: string;
		amount: number;
		currency: string;
		transaction_code: string;
	}[];
	reason?: {
		code: string;
		description?: string;
	};
};

export async function subsumGetCheckout(checkoutId: string): Promise<SumUpCheckoutResponse> {
	if (!runtimeConfig.sumUp.apiKey) {
		throw new Error('Missing sumup API key');
	}
	const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
		headers: {
			Authorization: 'Bearer ' + runtimeConfig.sumUp.apiKey
		},
		...{ autoSelectFamily: true }
	});
	if (!response.ok) {
		throw new Error(`Failed to fetch sumsub checkout ${checkoutId}`);
	}
	const checkout: SumUpCheckoutResponse = await response.json();
	return checkout;
}
