import { z } from 'zod';
import { runtimeConfig } from './runtime-config';
import { persistConfigElement } from './utils/persistConfig';
import { toUrlEncoded } from '$lib/utils/toUrlEncoded';

/**
 * The few Stripe Terminal calls a be-BOP-pos terminal needs to take a card with Tap to Pay, made
 * with the shop's Stripe settings: the device never holds a Stripe credential.
 * https://docs.stripe.com/terminal/payments/setup-integration
 */

async function stripe(path: string, init?: { method?: 'POST'; body?: Record<string, unknown> }) {
	const response = await fetch(`https://api.stripe.com/v1/${path}`, {
		method: init?.method ?? 'GET',
		headers: {
			Authorization: `Bearer ${runtimeConfig.stripe.secretKey}`,
			...(init?.body && { 'Content-Type': 'application/x-www-form-urlencoded' })
		},
		...(init?.body && { body: toUrlEncoded(init.body) })
	});
	if (!response.ok) {
		const text = await response.text();
		const { code, type } = stripeErrorOf(text);
		// https://docs.stripe.com/error-codes#amount-too-small: below Stripe's minimum charge amount.
		if (code === 'amount_too_small') {
			throw new StripeAmountTooSmallError(text);
		}
		throw new StripeApiError(path, response.status, text, code ?? type);
	}
	return response.json();
}

/** The amount is below the minimum Stripe charges in the currency of the shop's Stripe account. */
export class StripeAmountTooSmallError extends Error {}

/** Stripe refused a call. `reason` is its error code, or its error type when it gives no code. */
export class StripeApiError extends Error {
	constructor(
		path: string,
		readonly status: number,
		body: string,
		readonly reason?: string
	) {
		super(`Stripe ${path} failed (${status}): ${body}`);
	}

	/** What may be shown on a screen: the HTTP status and Stripe's code, never the body. */
	get summary(): string {
		return ['Stripe', this.status, this.reason].filter(Boolean).join(' ');
	}
}

function stripeErrorOf(body: string): { code?: string; type?: string } {
	try {
		const parsed = z
			.object({ error: z.object({ code: z.string().optional(), type: z.string().optional() }) })
			.safeParse(JSON.parse(body));
		return parsed.success ? parsed.data.error : {};
	} catch {
		return {};
	}
}

/**
 * Cards can be taken once the shop has a Stripe key and either a Location or the address to make
 * one at: the Location is created when a terminal first asks for it.
 */
export function isStripeTerminalReady(): boolean {
	return (
		!!runtimeConfig.stripe.secretKey &&
		(!!runtimeConfig.stripeTerminalLocationId || !!runtimeConfig.sellerIdentity?.address)
	);
}

/** The shop has no address to make a Stripe Location at: it is filled in under Identity. */
export class StripeLocationAddressMissingError extends Error {}

let ensuringLocation: Promise<string> | undefined;

/**
 * The Location the terminals connect to. The saved one if the Stripe account has it; else the
 * only Location of the account; else a new one at the address of the shop. Locations belong to a
 * Stripe account, so changing the keys leaves the saved one unknown to the new account.
 */
export function ensureLocation(): Promise<string> {
	ensuringLocation ??= resolveLocation().finally(() => {
		ensuringLocation = undefined;
	});
	return ensuringLocation;
}

async function resolveLocation(): Promise<string> {
	const locations = await listLocations();
	const saved = runtimeConfig.stripeTerminalLocationId;
	if (saved && locations.some((location) => location.id === saved)) {
		return saved;
	}

	let id: string;
	if (locations.length === 1) {
		id = locations[0].id;
	} else {
		const address = runtimeConfig.sellerIdentity?.address;
		if (!address) {
			throw new StripeLocationAddressMissingError();
		}
		id = await createLocation({
			displayName: runtimeConfig.sellerIdentity?.businessName || runtimeConfig.brandName,
			address: {
				line1: address.street,
				city: address.city,
				postalCode: address.zip,
				country: address.country
			}
		});
	}
	runtimeConfig.stripeTerminalLocationId = id;
	await persistConfigElement('stripeTerminalLocationId', id);
	return id;
}

/** A short-lived token the Stripe Terminal SDK of the device connects with, for a Location. */
export async function createConnectionToken(location: string): Promise<string> {
	const json = await stripe('terminal/connection_tokens', {
		method: 'POST',
		body: { location }
	});
	return z.object({ secret: z.string() }).parse(json).secret;
}

export async function listLocations(): Promise<Array<{ id: string; displayName: string }>> {
	const json = await stripe('terminal/locations?limit=100');
	return z
		.object({ data: z.array(z.object({ id: z.string(), display_name: z.string() })) })
		.parse(json)
		.data.map((location) => ({ id: location.id, displayName: location.display_name }));
}

/** One Location per establishment, at the address of the shop. */
export async function createLocation(params: {
	displayName: string;
	address: { line1: string; city: string; postalCode: string; country: string };
}): Promise<string> {
	const json = await stripe('terminal/locations', {
		method: 'POST',
		body: {
			display_name: params.displayName,
			address: {
				line1: params.address.line1,
				city: params.address.city,
				postal_code: params.address.postalCode,
				country: params.address.country
			}
		}
	});
	return z.object({ id: z.string() }).parse(json).id;
}

/** A card-present payment the terminal collects with Tap to Pay. Amount in minor units. */
export async function createCardPresentIntent(params: {
	amountMinor: number;
	currency: string;
	metadata: Record<string, string>;
	description: string;
}): Promise<{ id: string; clientSecret: string }> {
	const json = await stripe('payment_intents', {
		method: 'POST',
		body: {
			amount: params.amountMinor,
			currency: params.currency.toLowerCase(),
			payment_method_types: ['card_present'],
			capture_method: 'automatic',
			metadata: params.metadata,
			description: params.description
		}
	});
	const parsed = z.object({ id: z.string(), client_secret: z.string() }).parse(json);
	return { id: parsed.id, clientSecret: parsed.client_secret };
}

/** Cancels a card PaymentIntent of a terminal: once canceled, Stripe refuses to collect it. */
export async function cancelCardPresentIntent(id: string): Promise<void> {
	await stripe(`payment_intents/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: {} });
}
