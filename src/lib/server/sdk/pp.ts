import type { PaymentMethod, PaymentProcessor } from '$lib/server/payment-methods';
import type { ObjectId } from 'mongodb';
import type { Price, Order } from '$lib/types/Order';
import type { SerializedPaymentPresentation } from '$lib/types/Order';
import { CURRENCY_UNIT, type Currency } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { runtimeConfig } from '$lib/server/runtime-config';
import { PROCESSORS } from '$lib/types/paymentProcessors';
import type { ZodType, ZodTypeDef } from 'zod';

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
	/** The provider's own handle on the movement: a chain txid, a card auth code, a SEPA id. */
	reference?: string;
}

/**
 * Discriminated on `status` so a processor cannot report a payment as settled without
 * saying what arrived, and cannot attach progress to a terminal status.
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
			 * Observed, but not final — money the provider has seen and may still take back.
			 * Onchain: a full-amount transaction under the confirmation threshold. Card: an
			 * authorisation not yet captured. PayPal: a capture still PENDING, an eCheck
			 * clearing. SEPA: a transfer in clearing. The buyer is told it arrived and is
			 * being confirmed; the order does not settle on it.
			 */
			provisional?: { received: Price; reason?: string };
			/**
			 * Opaque, processor-private, carried between polls. A processor that needs to
			 * remember something across the 2s loop puts it here rather than inventing a
			 * column: the onchain grace window is one instance, a provider cursor another.
			 */
			state?: Record<string, unknown>;
			transactions?: PaymentTransaction[];
	  }
	| { status: 'expired' | 'failed' | 'canceled' };

export interface PaymentPresentation {
	kind: SerializedPaymentPresentation['kind'];
	/** What the QR encodes. Absent = `payment.address` verbatim. */
	qrPayload?(payment: Order['payments'][number]): string;
	/** URI the QR image links to, so tapping it opens a wallet. Absent = not clickable. */
	qrLink?(payment: Order['payments'][number]): string;
	/** Tags a wallet browser extension looks for on the payment page. */
	headTags?(payment: Order['payments'][number]): Array<{ name: string; content: string }>;
}

/**
 * The processor that handled a payment. Rows written before the registry recorded one
 * fall back to whichever processor currently serves the method.
 */
export function processorFor(
	payment: Order['payments'][number]
): PaymentProcessorDefinition | undefined {
	const recorded = payment.processor ? getProcessor(payment.processor) : undefined;

	return recorded ?? resolveProcessor(payment.method);
}

export function serializePresentation(
	pp: PaymentProcessorDefinition | undefined,
	payment: Order['payments'][number]
): SerializedPaymentPresentation | undefined {
	if (!pp?.presentation) {
		return undefined;
	}

	const { kind, qrLink, headTags } = pp.presentation;

	return {
		kind,
		...(qrLink && { qrLink: qrLink(payment) }),
		...(headTags && { headTags: headTags(payment) })
	};
}

export interface PaymentProcessorDefinition {
	meta: PaymentProcessorMeta;
	isEnabled(): boolean;

	/**
	 * Validates this processor's settings form. Absent for the ones configured by environment
	 * variables and for the hand-settled methods, which have no credentials of their own.
	 * Declaring it here is what lets one shared settings page serve every processor: the shape
	 * of a provider's credentials is the provider's business, not the page's.
	 */
	configSchema?: ZodType<Record<string, unknown>, ZodTypeDef, unknown>;

	/**
	 * Currency the payment is asked for. Not the currency it arrives in: `checkPayment`
	 * reports whatever the provider actually settled.
	 */
	settlementCurrency(): Currency;

	/**
	 * When the payment stops being payable. `null` = it never does, for anything settled
	 * by hand. Absent = the shop's payment timeout from now.
	 */
	expiresIn?(timeoutMinutes: number): Date | null;

	/**
	 * Shortfall accepted between what arrived and what was asked, in the settlement
	 * currency. Absent = one currency unit, which only absorbs rounding.
	 */
	underpaymentTolerance?(currency: Currency): number;

	/**
	 * How the buyer is asked to pay. Absent = nothing to scan or follow.
	 * Owning the payload and the link together is what keeps a QR from being labelled
	 * as one protocol while encoding another.
	 */
	presentation?: PaymentPresentation;

	/**
	 * Absent = this processor cannot settle a contactless payment made on the terminal.
	 * `findMatching` returns the provider reference of a transaction that matches the
	 * payment's amount and tap window, or `null` when none does yet.
	 */
	tapToPay?: {
		findMatching(order: Order, paymentId: ObjectId): Promise<string | null>;
	};

	/**
	 * Background work this processor needs while it is enabled: a provider subscription,
	 * a chain tip poll. Started once per cluster under a lock, never per request and never
	 * from inside `checkPayment`. Resolves to a function that stops it.
	 */
	worker?: {
		start(): Promise<() => void>;
	};

	/** `params.toPay` is already in `settlementCurrency()` — do not convert it again. */
	createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;

	/**
	 * Absent = nothing to poll, because settlement happens out of band: cash in a till,
	 * a wire the shopowner reconciles, an order that was free to begin with. Such a
	 * payment only ever changes status when someone says so.
	 */
	checkPayment?(payment: Order['payments'][number], order: Order): Promise<CheckPaymentResult>;
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

/** Nothing to scan or follow: the buyer pays in the room, by wire, or not at all. */
export const MANUAL_PRESENTATION: PaymentPresentation = { kind: 'manual' };

// --- Registry ---

const registry = new Map<string, PaymentProcessorDefinition>();

export function registerProcessor(pp: PaymentProcessorDefinition): void {
	registry.set(pp.meta.processor, pp);
}

export function getProcessor(processor: string): PaymentProcessorDefinition | undefined {
	return registry.get(processor);
}

export function allProcessors(): PaymentProcessorDefinition[] {
	return [...registry.values()];
}

/** Processors that can settle a contactless payment made on a terminal. */
export function tapToPayProcessors(): PaymentProcessor[] {
	return allProcessors()
		.filter((pp) => pp.tapToPay)
		.map((pp) => pp.meta.processor);
}

export function getProcessorsForMethod(method: PaymentMethod): PaymentProcessorDefinition[] {
	return (
		[...registry.values()]
			.filter((pp) => pp.meta.method === method)
			// Declared rank, not load order. `resolveProcessor` returns the first enabled one, so
			// this decides which acquirer a shop that expressed no preference actually uses.
			.sort((a, b) => PROCESSORS[a.meta.processor].priority - PROCESSORS[b.meta.processor].priority)
	);
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
