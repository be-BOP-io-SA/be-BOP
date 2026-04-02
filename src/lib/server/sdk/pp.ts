import type { PaymentMethod, PaymentProcessor } from '$lib/server/payment-methods';
import type { Price, Order } from '$lib/types/Order';
import type { Currency } from '$lib/types/Currency';
import { runtimeConfig } from '$lib/server/runtime-config';
import { ORIGIN } from '$lib/server/env-config';
import { toCurrency } from '$lib/utils/toCurrency';

// --- Interfaces ---

export interface PaymentProcessorMeta {
	processor: PaymentProcessor;
	method: PaymentMethod;
	emoji?: string;
}

export interface CreatePaymentParams {
	orderId: string;
	orderNumber: number;
	paymentId: string;
	toPay: Price;
	expiresAt?: Date;
}

export interface CreatePaymentResult {
	address?: string;
	invoiceId?: string;
	checkoutId?: string;
	processor: PaymentProcessor;
	wallet?: string;
	label?: string;
	clientSecret?: string;
	meta?: unknown;
}

export interface CheckPaymentResult {
	status: 'paid' | 'pending' | 'expired' | 'failed' | 'canceled';
	received?: Price;
	transactions?: Array<{
		id: string;
		amount: number;
		currency: Currency;
		transaction_code?: string;
		txid?: string;
	}>;
	fees?: Price;
}

export interface PaymentProcessorDefinition {
	meta: PaymentProcessorMeta;
	isEnabled(): boolean;
	paymentPrice(price: Price): Price;
	createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
	checkPayment(payment: Order['payments'][number], order: Order): Promise<CheckPaymentResult>;
}

// --- Helpers ---

export function lightningPaymentPrice(price: Price): Price {
	return {
		amount: toCurrency('SAT', price.amount, price.currency),
		currency: 'SAT'
	};
}

export function bitcoinPaymentPrice(price: Price): Price {
	return {
		amount: toCurrency('BTC', price.amount, price.currency),
		currency: 'BTC'
	};
}

export function lightningLabel(orderId: string, orderNumber: number): string {
	switch (runtimeConfig.lightningQrCodeDescription) {
		case 'brand':
			return runtimeConfig.brandName;
		case 'orderUrl':
			return `${ORIGIN}/order/${orderId}`;
		case 'brandAndOrderNumber':
			return `${runtimeConfig.brandName} - Order #${orderNumber.toLocaleString('en')}`;
		default:
			return '';
	}
}

// --- Registry ---

const registry = new Map<string, PaymentProcessorDefinition>();

export function registerProcessor(pp: PaymentProcessorDefinition): void {
	registry.set(pp.meta.processor, pp);
}

export function getProcessor(processor: string): PaymentProcessorDefinition | undefined {
	return registry.get(processor);
}

export function getProcessorsForMethod(method: PaymentMethod): PaymentProcessorDefinition[] {
	return [...registry.values()].filter((pp) => pp.meta.method === method);
}

export function resolveProcessor(method: PaymentMethod): PaymentProcessorDefinition | undefined {
	const processors = getProcessorsForMethod(method).filter((pp) => pp.isEnabled());
	if (!processors.length) {
		return undefined;
	}

	const preferred = runtimeConfig.paymentProcessorPreferences?.[method];
	if (preferred) {
		const pp = processors.find((p) => p.meta.processor === preferred);
		if (pp) {
			return pp;
		}
	}

	return processors[0];
}
