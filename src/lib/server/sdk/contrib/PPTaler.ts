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

// --- Taler API helpers (private to this module) ---

function isTalerEnabled(): boolean {
	return !!runtimeConfig.taler.backendUrl && !!runtimeConfig.taler.backendApiKey;
}

// Demo backend (backend.demo.taler.net) uses test currency KUDOS instead of real currencies
function isDemoMerchantBackend(): boolean {
	return runtimeConfig.taler.backendUrl.startsWith('https://backend.demo.taler.net');
}

/** Resolve KUDOS test currency to configured currency, pass through real currencies */
function resolveTalerCurrency(currencyStr: string): string {
	return currencyStr === 'KUDOS' ? runtimeConfig.taler.currency : currencyStr;
}

const talerOrderSchema = z.object({
	taler_pay_uri: z.string().optional(),
	order_status: z.enum(['unpaid', 'paid', 'claimed']),
	contract_terms: z.object({ amount: z.string() }).optional()
});

type TalerOrder = z.infer<typeof talerOrderSchema>;

function buildTalerHeaders(): Record<string, string> {
	return {
		Authorization: `Bearer ${runtimeConfig.taler.backendApiKey}`,
		'Content-Type': 'application/json'
	};
}

async function getTalerOrder(orderId: string): Promise<TalerOrder | 'not_found'> {
	const resp = await fetch(`${runtimeConfig.taler.backendUrl}/private/orders/${orderId}`, {
		headers: buildTalerHeaders()
	});
	if (resp.status === 404) {
		return 'not_found';
	}
	if (!resp.ok) {
		const errText = await resp.text();
		throw new Error(
			`Failed to get Taler order ${orderId}: ${resp.status} ${resp.statusText} — ${errText}`
		);
	}
	return talerOrderSchema.parse(await resp.json());
}

// --- SDK Payment Processor ---

export default {
	meta: { processor: 'taler', method: 'taler', emoji: '🪙' },

	isEnabled: () => isTalerEnabled(),

	paymentPrice(price) {
		const currency = runtimeConfig.taler.currency;
		return {
			amount: toCurrency(currency, price.amount, price.currency),
			currency
		};
	},

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const currency = runtimeConfig.taler.currency;
		const amount = toCurrency(currency, params.toPay.amount, params.toPay.currency);
		const talerCurrency = isDemoMerchantBackend() ? 'KUDOS' : currency;
		const talerAmount = `${talerCurrency}:${amount.toFixed(
			FRACTION_DIGITS_PER_CURRENCY[currency]
		)}`;

		// Step 1: Create order in Taler merchant backend
		const createResp = await fetch(`${runtimeConfig.taler.backendUrl}/private/orders`, {
			method: 'POST',
			headers: buildTalerHeaders(),
			body: JSON.stringify({
				order: {
					amount: talerAmount,
					summary: `Order #${params.orderNumber}`,
					fulfillment_url: `${ORIGIN}/order/${params.orderId}`,
					...(params.expiresAt && {
						pay_deadline: { t_s: Math.floor(params.expiresAt.getTime() / 1000) }
					})
				}
			})
		});
		if (!createResp.ok) {
			const errText = await createResp.text();
			throw new Error(`Taler order creation failed (${createResp.status}): ${errText}`);
		}
		const { order_id } = z.object({ order_id: z.string() }).parse(await createResp.json());

		// Step 2: Fetch order details to get taler_pay_uri for QR code
		const orderData = await getTalerOrder(order_id);
		if (orderData === 'not_found') {
			throw new Error(`Taler order ${order_id} not found after creation`);
		}
		if (!orderData.taler_pay_uri) {
			throw new Error(`Taler order ${order_id} missing taler_pay_uri`);
		}

		return {
			checkoutId: order_id,
			address: orderData.taler_pay_uri,
			processor: 'taler'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.checkoutId) {
			return { status: 'pending' };
		}

		const orderData = await getTalerOrder(payment.checkoutId);
		if (orderData === 'not_found') {
			return { status: 'failed' };
		}

		if (orderData.order_status === 'paid') {
			const amountStr = orderData.contract_terms?.amount;
			if (!amountStr) {
				throw new Error(`Taler order ${payment.checkoutId} paid but missing contract_terms.amount`);
			}

			const colonIdx = amountStr.indexOf(':');
			if (colonIdx === -1) {
				throw new Error(`Taler order ${payment.checkoutId}: malformed amount "${amountStr}"`);
			}
			const currencyStr = amountStr.slice(0, colonIdx);
			const amountValue = amountStr.slice(colonIdx + 1);
			const parsedAmount = Number(amountValue);
			if (isNaN(parsedAmount)) {
				throw new Error(`Taler order ${payment.checkoutId}: non-numeric amount "${amountValue}"`);
			}

			const resolvedCurrency = resolveTalerCurrency(currencyStr);

			if (!typedInclude(CURRENCIES, resolvedCurrency)) {
				throw new Error(`Taler returned unknown currency: ${resolvedCurrency}`);
			}

			return {
				status: 'paid',
				received: {
					amount: parsedAmount,
					currency: resolvedCurrency
				}
			};
		}

		if (payment.expiresAt && payment.expiresAt < new Date()) {
			return { status: 'expired' };
		}

		// 'claimed' (wallet grabbed order) and 'unpaid' → pending
		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
