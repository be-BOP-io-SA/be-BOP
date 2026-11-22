import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { runtimeConfig } from '$lib/server/runtime-config';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { CURRENCIES } from '$lib/types/Currency';

/** PayPal on paired terminals: its own PayPal app, apart from the shop's PayPal. */
export function load() {
	const { clientId, secret, sandbox, currency } = runtimeConfig.paypalPos;
	return { clientId, hasSecret: !!secret, sandbox, currency };
}

export const actions = {
	async save({ request }) {
		const parsed = z
			.object({
				clientId: z.string().trim(),
				// Left empty, the saved secret is kept: the page never shows it.
				secret: z.string().trim(),
				sandbox: z.boolean({ coerce: true }).default(false),
				currency: z.enum(CURRENCIES)
			})
			.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { error: true });
		}
		const paypalPos = {
			clientId: parsed.data.clientId,
			secret: parsed.data.secret || runtimeConfig.paypalPos.secret,
			sandbox: parsed.data.sandbox,
			currency: parsed.data.currency
		};
		runtimeConfig.paypalPos = paypalPos;
		await persistConfigElement('paypalPos', paypalPos);
		return { saved: true };
	},

	async reset() {
		const paypalPos = { clientId: '', secret: '', sandbox: false, currency: 'EUR' as const };
		runtimeConfig.paypalPos = paypalPos;
		await persistConfigElement('paypalPos', paypalPos);
	}
};
