import type { PaymentMethod, PaymentProcessor } from '$lib/server/payment-methods';
import type { Price, Order } from '$lib/types/Order';
import { CURRENCY_UNIT, type Currency } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { runtimeConfig } from '$lib/server/runtime-config';
import { ORIGIN } from '$lib/server/env-config';

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

export interface PaymentTransaction {
	id: string;
	amount: number;
	currency: Currency;
	transaction_code?: string;
	txid?: string;
}

/**
 * Discriminated on `status` so a processor cannot report a payment as settled without
 * saying what arrived, and cannot attach onchain progress to a terminal status.
 */
export type CheckPaymentResult =
	| {
			status: 'paid';
			/** What actually arrived, in whatever currency the provider settled in. */
			received: Price;
			fees?: Price;
			transactions?: PaymentTransaction[];
	  }
	| {
			status: 'pending';
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
			transactions?: PaymentTransaction[];
	  }
	| { status: 'expired' | 'failed' | 'canceled' };

export interface PaymentProcessorDefinition {
	meta: PaymentProcessorMeta;
	isEnabled(): boolean;

	/**
	 * Currency the payment is asked for. Not the currency it arrives in: `checkPayment`
	 * reports whatever the provider actually settled.
	 */
	settlementCurrency(): Currency;

	/** Absent = the shop's payment timeout applies unchanged. */
	expiresIn?(timeoutMinutes: number): Date | undefined;

	/**
	 * Shortfall accepted between what arrived and what was asked, in the settlement
	 * currency. Absent = one currency unit, which only absorbs rounding.
	 */
	underpaymentTolerance?(currency: Currency): number;

	/** `params.toPay` is already in `settlementCurrency()` — do not convert it again. */
	createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;

	checkPayment(payment: Order['payments'][number], order: Order): Promise<CheckPaymentResult>;
}

// --- Helpers ---

/**
 * Whether what the provider says arrived covers what the payment asked for.
 * Providers report in their own currency, so the comparison happens in the payment's.
 */
export function coversPayment(
	pp: PaymentProcessorDefinition,
	payment: Order['payments'][number],
	received: Price
): boolean {
	const currency = payment.price.currency;
	const settled = toCurrency(currency, received.amount, received.currency);
	const tolerance = pp.underpaymentTolerance?.(currency) ?? CURRENCY_UNIT[currency];

	return settled >= payment.price.amount - tolerance;
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
