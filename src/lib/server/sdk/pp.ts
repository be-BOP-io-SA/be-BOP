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
	/**
	 * For onchain payments: a full-amount TX is detected but not yet confirmed to the
	 * required threshold. Surfaced to the buyer as "received, awaiting confirmation".
	 */
	awaitingConfirmation?: boolean;
	/**
	 * For onchain payments: the persisted start of the post-expiry grace window (see
	 * `OrderPayment.mempoolMissingSince`). `null` means "clear it". Persisted by the worker.
	 */
	mempoolMissingSince?: Date | null;
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
	/** Receives this processor's pending payments on every order loop turn; `[]` means stop watching. */
	watchPendingPayments?(payments: Order['payments'][number][]): void;
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

/** Processor and method must both match, so tap-to-pay (stripe, point-of-sale) skips PPStripe. */
export function processorFor(
	payment: Order['payments'][number],
	isEnabled = (pp: PaymentProcessorDefinition) => pp.isEnabled()
): PaymentProcessorDefinition | undefined {
	const pp = payment.processor ? registry.get(payment.processor) : undefined;
	return pp && pp.meta.method === payment.method && isEnabled(pp) ? pp : undefined;
}

/** Pass no orders to make every processor stop watching, e.g. when this instance loses the lock. */
export function dispatchPendingPayments(orders: Order[]): void {
	const pending = orders.flatMap((order) => order.payments.filter((p) => p.status === 'pending'));
	for (const pp of registry.values()) {
		if (!pp.watchPendingPayments) {
			continue;
		}
		// isEnabled can derive an address, too costly to repeat for every payment on every turn.
		const enabled = pp.isEnabled();
		const payments = pending.filter(
			(payment) => processorFor(payment, (candidate) => candidate === pp && enabled) === pp
		);
		try {
			pp.watchPendingPayments(payments);
		} catch (err) {
			console.error(`${pp.meta.processor} failed to watch pending payments:`, err);
		}
	}
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
