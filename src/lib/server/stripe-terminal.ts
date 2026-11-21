import { z } from 'zod';
import { runtimeConfig } from './runtime-config';
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
		throw new Error(`Stripe ${path} failed (${response.status}): ${await response.text()}`);
	}
	return response.json();
}

export function isStripeTerminalReady(): boolean {
	return !!runtimeConfig.stripe.secretKey && !!runtimeConfig.stripeTerminalLocationId;
}

/** A short-lived token the Stripe Terminal SDK of the device connects with. */
export async function createConnectionToken(): Promise<string> {
	const json = await stripe('terminal/connection_tokens', {
		method: 'POST',
		body: runtimeConfig.stripeTerminalLocationId
			? { location: runtimeConfig.stripeTerminalLocationId }
			: {}
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
