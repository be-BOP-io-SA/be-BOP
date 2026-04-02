import { isSumupEnabled } from '$lib/server/sumup';
import { runtimeConfig } from '$lib/server/runtime-config';
import { toCurrency } from '$lib/utils/toCurrency';
import { CURRENCIES } from '$lib/types/Currency';
import { typedInclude } from '$lib/utils/typedIncludes';
import { ORIGIN } from '$lib/server/env-config';
import { z } from 'zod';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

export default {
	meta: { processor: 'sumup', method: 'card' },

	isEnabled: () => isSumupEnabled(),

	paymentPrice(price) {
		const currency = runtimeConfig.sumUp.currency;
		return {
			amount: toCurrency(currency, price.amount, price.currency),
			currency
		};
	},

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const currency = runtimeConfig.sumUp.currency;
		const amount = toCurrency(currency, params.toPay.amount, params.toPay.currency);

		const resp = await fetch('https://api.sumup.com/v0.1/checkouts', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${runtimeConfig.sumUp.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				amount,
				currency,
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
			const err = await resp.text();
			throw new Error(`SumUp checkout creation failed (${resp.status}): ${err}`);
		}

		const json = z.object({ id: z.string() }).parse(await resp.json());

		return {
			checkoutId: json.id,
			address: `${ORIGIN}/order/${params.orderId}/payment/${params.paymentId}/pay`,
			processor: 'sumup'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order
	): Promise<CheckPaymentResult> {
		if (!runtimeConfig.sumUp.apiKey) {
			throw new Error('Missing sumup API key');
		}

		const checkoutId = payment.checkoutId;

		if (!checkoutId) {
			throw new Error('Missing checkout ID on SumUp order');
		}

		const response = await fetch('https://api.sumup.com/v0.1/checkouts/' + checkoutId, {
			headers: {
				Authorization: 'Bearer ' + runtimeConfig.sumUp.apiKey
			},
			...{ autoSelectFamily: true }
		});

		if (!response.ok) {
			throw new Error(
				'Failed to fetch checkout status for order ' + order._id + ', checkout ' + checkoutId
			);
		}

		const checkout = z
			.object({
				status: z.string(),
				amount: z.number().optional(),
				currency: z.string().optional(),
				transactions: z
					.array(
						z.object({
							id: z.string(),
							amount: z.number(),
							currency: z.string(),
							transaction_code: z.string().optional()
						})
					)
					.optional()
			})
			.parse(await response.json());

		if (checkout.status === 'PAID') {
			const rawCurrency = checkout.currency?.toUpperCase();
			if (!typedInclude(CURRENCIES, rawCurrency)) {
				throw new Error(`SumUp returned unknown currency: ${rawCurrency}`);
			}
			if (checkout.amount === undefined) {
				throw new Error(`SumUp returned no amount for checkout ${checkoutId}`);
			}
			return {
				status: 'paid',
				received: {
					amount: checkout.amount,
					currency: rawCurrency
				},
				transactions: checkout.transactions?.map((t) => ({
					...t,
					currency: rawCurrency
				}))
			};
		}

		if (checkout.status === 'FAILED') {
			return { status: 'failed' };
		}

		if (checkout.status === 'EXPIRED') {
			return { status: 'expired' };
		}

		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
