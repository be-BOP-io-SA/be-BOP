import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { runtimeConfig } from '$lib/server/runtime-config';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { createLocation, listLocations } from '$lib/server/stripe-terminal';

/** The Stripe Location the shop's Tap to Pay terminals connect to: one per establishment. */
export async function load() {
	const stripeConfigured = !!runtimeConfig.stripe.secretKey;
	const locations = stripeConfigured
		? await listLocations().catch((err) => {
				console.error('[stripe terminal] cannot list locations', err);
				return null;
		  })
		: [];

	return {
		stripeConfigured,
		locations,
		locationId: runtimeConfig.stripeTerminalLocationId,
		sellerAddress: runtimeConfig.sellerIdentity?.address ?? null,
		defaultName: runtimeConfig.sellerIdentity?.businessName || runtimeConfig.brandName
	};
}

async function saveLocation(id: string) {
	runtimeConfig.stripeTerminalLocationId = id;
	await persistConfigElement('stripeTerminalLocationId', id);
}

export const actions = {
	async select({ request }) {
		const id = String((await request.formData()).get('locationId') ?? '');
		await saveLocation(id);
	},

	async create({ request }) {
		const address = runtimeConfig.sellerIdentity?.address;
		const parsed = z
			.object({ displayName: z.string().trim().min(1).max(100) })
			.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success || !address) {
			return fail(400, { error: 'address' as const });
		}
		try {
			const id = await createLocation({
				displayName: parsed.data.displayName,
				address: {
					line1: address.street,
					city: address.city,
					postalCode: address.zip,
					country: address.country
				}
			});
			await saveLocation(id);
		} catch (err) {
			console.error('[stripe terminal] cannot create location', err);
			return fail(502, { error: 'stripe' as const });
		}
	}
};
