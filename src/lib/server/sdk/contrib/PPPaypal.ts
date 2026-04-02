import {
	isPaypalEnabled,
	paypalAccessToken,
	paypalApiOrigin,
	paypalGetCheckout
} from '$lib/server/paypal';
import { runtimeConfig } from '$lib/server/runtime-config';
import { toCurrency } from '$lib/utils/toCurrency';
import { FRACTION_DIGITS_PER_CURRENCY, CURRENCIES } from '$lib/types/Currency';
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
	meta: { processor: 'paypal', method: 'paypal' },

	isEnabled: () => isPaypalEnabled(),

	paymentPrice(price) {
		const currency = runtimeConfig.paypal.currency;
		return {
			amount: toCurrency(currency, price.amount, price.currency),
			currency
		};
	},

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const currency = runtimeConfig.paypal.currency;
		const amount = toCurrency(currency, params.toPay.amount, params.toPay.currency);

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
							currency_code: currency,
							value: amount.toFixed(FRACTION_DIGITS_PER_CURRENCY[currency])
						},
						description: 'Order ' + params.orderNumber
					}
				],
				application_context: {
					user_action: 'PAY_NOW',
					shipping_preference: 'NO_SHIPPING',
					return_url: `${ORIGIN}/order/${params.orderId}`,
					cancel_url: `${ORIGIN}/order/${params.orderId}?paymentId=${params.paymentId}&cancel=true`
				}
			})
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`PayPal checkout creation failed (${response.status}): ${err}`);
		}

		const json = z
			.object({
				id: z.string(),
				links: z.array(z.object({ rel: z.string(), href: z.string() }))
			})
			.parse(await response.json());

		const approveLink = json.links.find((link) => link.rel === 'approve');

		if (!approveLink) {
			throw new Error(`PayPal returned no approve link for order ${params.orderId}`);
		}

		return {
			checkoutId: json.id,
			address: approveLink.href,
			processor: 'paypal'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.checkoutId) {
			return { status: 'pending' };
		}

		const checkout = await paypalGetCheckout(payment.checkoutId);

		if (checkout.status === 'COMPLETED') {
			const rawCurrency = checkout.purchase_units[0].amount.currency_code?.toUpperCase();
			if (!typedInclude(CURRENCIES, rawCurrency)) {
				throw new Error(`PayPal returned unknown currency: ${rawCurrency}`);
			}
			return {
				status: 'paid',
				received: {
					amount: Number(checkout.purchase_units[0].amount.value),
					currency: rawCurrency
				}
			};
		}

		if (checkout.status === 'VOIDED') {
			return { status: 'failed' };
		}

		if (payment.expiresAt && payment.expiresAt < new Date()) {
			return { status: 'expired' };
		}

		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
