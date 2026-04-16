import { runtimeConfig } from '$lib/server/runtime-config';
import { toCurrency } from '$lib/utils/toCurrency';
import { ORIGIN } from '$lib/server/env-config';
import { z } from 'zod';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

// --- OSB (PayZen/Lyra) REST V4 API helpers ---

const OSB_API_BASE = 'https://api.secure.osb.pf/api-payment/V4';

function isOsbEnabled(): boolean {
	return !!runtimeConfig.osb.shopId && !!runtimeConfig.osb.password;
}

function osbAuthHeader(): string {
	return (
		'Basic ' +
		Buffer.from(`${runtimeConfig.osb.shopId}:${runtimeConfig.osb.password}`).toString('base64')
	);
}

async function osbRequest(endpoint: string, body: object): Promise<unknown> {
	const resp = await fetch(`${OSB_API_BASE}/${endpoint}`, {
		method: 'POST',
		headers: {
			Authorization: osbAuthHeader(),
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!resp.ok) {
		const errText = await resp.text();
		throw new Error(`OSB ${endpoint} failed (${resp.status}): ${errText}`);
	}
	const json = await resp.json();
	if (json?.status && json.status !== 'SUCCESS') {
		const code = json.answer?.errorCode ?? 'UNKNOWN';
		const msg = json.answer?.errorMessage ?? JSON.stringify(json);
		throw new Error(`OSB ${endpoint}: ${json.status} ${code} — ${msg}`);
	}
	return json;
}

// --- Zod schemas for API responses ---

const osbCreatePaymentOrderSchema = z.object({
	status: z.literal('SUCCESS'),
	answer: z.object({
		paymentOrderId: z.string(),
		paymentURL: z.string().url(),
		paymentOrderStatus: z.string(),
		amount: z.number(),
		currency: z.literal('XPF')
	})
});

const osbPaymentOrderGetSchema = z.object({
	status: z.literal('SUCCESS'),
	answer: z.object({
		paymentOrderId: z.string(),
		paymentOrderStatus: z.enum(['RUNNING', 'PAID', 'REFUSED', 'EXPIRED', 'CANCELED']),
		amount: z.number(),
		currency: z.literal('XPF')
	})
});

// --- SDK Payment Processor ---

export default {
	meta: { processor: 'osb', method: 'osb', emoji: '🇵🇫' },

	isEnabled: () => isOsbEnabled(),

	paymentPrice(price) {
		return {
			amount: toCurrency('XPF', price.amount, price.currency),
			currency: 'XPF'
		};
	},

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		// XPF has 0 decimals (ISO 4217), but FRACTION_DIGITS_PER_CURRENCY.XPF = 2 in codebase
		// Math.round ensures we send an integer to OSB API
		const amount = Math.round(toCurrency('XPF', params.toPay.amount, params.toPay.currency));

		const resp = osbCreatePaymentOrderSchema.parse(
			await osbRequest('Charge/CreatePaymentOrder', {
				amount,
				currency: 'XPF',
				orderId: String(params.orderNumber),
				channelOptions: { channelType: 'URL' },
				successUrl: `${ORIGIN}/order/${params.orderId}`,
				cancelUrl: `${ORIGIN}/order/${params.orderId}?cancel=true`,
				errorUrl: `${ORIGIN}/order/${params.orderId}`,
				...(params.expiresAt && { expirationDate: params.expiresAt.toISOString() })
			})
		);

		return {
			checkoutId: resp.answer.paymentOrderId,
			address: resp.answer.paymentURL,
			processor: 'osb'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.checkoutId) {
			return { status: 'pending' };
		}

		let resp;
		try {
			resp = osbPaymentOrderGetSchema.parse(
				await osbRequest('Charge/PaymentOrder/Get', {
					paymentOrderId: payment.checkoutId
				})
			);
		} catch (err) {
			throw new Error(`OSB checkPayment failed for ${payment.checkoutId}: ${err}`);
		}

		const st = resp.answer.paymentOrderStatus;

		if (st === 'PAID') {
			return {
				status: 'paid',
				received: { amount: resp.answer.amount, currency: 'XPF' }
			};
		}
		if (st === 'REFUSED' || st === 'CANCELED') {
			return { status: 'failed' };
		}
		if (st === 'EXPIRED') {
			return { status: 'expired' };
		}
		if (payment.expiresAt && payment.expiresAt < new Date()) {
			return { status: 'expired' };
		}

		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
