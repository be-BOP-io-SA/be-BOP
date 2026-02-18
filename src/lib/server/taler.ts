import { z } from 'zod';
import { runtimeConfig } from './runtime-config';

const timestampSchema = z.object({
	t_s: z.union([z.number().int().min(0), z.literal('never')])
});

const contractTermsSchema = z.object({
	amount: z.string()
});

export const talerPaymentUnpaidResponseSchema = z.object({
	order_status: z.literal('unpaid'),
	creation_time: timestampSchema,
	summary: z.string(),
	total_amount: z.string(),
	taler_pay_uri: z.string(),
	order_status_url: z.string()
});

export const talerPaymentClaimedResponseSchema = z.object({
	order_status: z.literal('claimed'),
	contract_terms: contractTermsSchema
});

export const talerPaymentPaidResponseSchema = z.object({
	order_status: z.literal('paid'),
	contract_terms: contractTermsSchema,
	order_status_url: z.string()
});

export type TalerPaymentPaidResponse = z.infer<typeof talerPaymentPaidResponseSchema>;
export type TalerPaymentClaimedResponse = z.infer<typeof talerPaymentClaimedResponseSchema>;
export type TalerPaymentUnpaidResponse = z.infer<typeof talerPaymentUnpaidResponseSchema>;

export const talerMerchantOrderStatusResponseSchema = z.discriminatedUnion('order_status', [
	talerPaymentPaidResponseSchema,
	talerPaymentClaimedResponseSchema,
	talerPaymentUnpaidResponseSchema
]);

export type TalerMerchantOrderStatusResponse = z.infer<
	typeof talerMerchantOrderStatusResponseSchema
>;

export function isTalerEnabled() {
	return !!runtimeConfig.taler.backendUrl && !!runtimeConfig.taler.backendApiKey;
}

// test if we need to use KUDOS
export function isDemoMerchantBackend() {
	return runtimeConfig.taler?.backendUrl?.startsWith('https://backend.demo.taler.net');
}

// In Taler, `KUDOS` is used as a demo currency.
// be-BOP cannot store payments with an unexisting currency (because it calculates exchange rates).
// When reading payments, we fallback to the configured currency if `KUDOS` was used and the demo backend is used
export function handleDemoCurrency(currency: string | undefined): string {
	return currency && currency !== 'KUDOS' && !isDemoMerchantBackend()
		? currency
		: runtimeConfig.taler.currency;
}

// In Taler, `KUDOS` is used as a demo currency.
// be-BOP cannot store payments with an unexisting currency (because it calculates exchange rates).
// When creating a payment, we manually change the currency to `KUDOS` if the demo backend is used.
export function getCurrencyForPayment(): string {
	return isDemoMerchantBackend() ? 'KUDOS' : runtimeConfig.taler.currency;
}

export async function talerGetOrder(
	orderId: string
): Promise<TalerMerchantOrderStatusResponse | 'not_found'> {
	const response = await fetch(`${runtimeConfig.taler.backendUrl}/private/orders/${orderId}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${runtimeConfig.taler.backendApiKey}`,
			'Content-Type': 'application/json'
		}
	});

	if (response.status === 404) {
		return 'not_found';
	}

	if (!response.ok) {
		throw new Error(`Failed to get Taler order: ${response.status} ${response.statusText}`);
	}

	const rawOrder = await response.json();
	const parsed = talerMerchantOrderStatusResponseSchema.safeParse(rawOrder);

	if (!parsed.success) {
		throw new Error(
			`Invalid Taler order response: ${parsed.error.message}\n${JSON.stringify(
				parsed.error.errors,
				null,
				2
			)}`
		);
	}

	return parsed.data;
}
