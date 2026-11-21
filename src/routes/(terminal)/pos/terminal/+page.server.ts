import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { terminalKeyOf } from '$lib/server/api/pos-terminal';
import {
	PosPaymentError,
	createPosPayment,
	terminalPaymentMethods
} from '$lib/server/pos-payments';
import { runtimeConfig } from '$lib/server/runtime-config';
import { ALL_PAYMENT_METHODS } from '$lib/server/payment-methods';

/**
 * The payment screen of a paired terminal: amount, tip, the till's reference, then how the
 * customer pays. The app opens it once with `Authorization: Bearer <API key>`; a cookie then
 * keeps the terminal signed in on the pages that follow.
 */
export async function load(event) {
	const apiKey = await terminalKeyOf(event);

	if (!apiKey) {
		return { paired: false as const };
	}

	return {
		paired: true as const,
		deviceName: apiKey.name,
		currency: runtimeConfig.mainCurrency,
		methods: terminalPaymentMethods()
	};
}

export const actions = {
	async pay(event) {
		const apiKey = await terminalKeyOf(event);
		if (!apiKey) {
			return fail(401, { error: 'notPaired' as const });
		}

		const parsed = z
			.object({
				amount: z.number({ coerce: true }).positive(),
				tip: z.number({ coerce: true }).min(0).default(0),
				externalRef: z.string().max(100).optional(),
				method: z.enum(ALL_PAYMENT_METHODS)
			})
			.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success) {
			return fail(400, { error: 'invalid' as const });
		}

		let id: string;
		try {
			const posPayment = await createPosPayment({
				device: { apiKeyId: apiKey._id, name: apiKey.name },
				amount: parsed.data.amount,
				tip: parsed.data.tip,
				method: parsed.data.method,
				externalRef: parsed.data.externalRef
			});
			id = posPayment._id.toHexString();
		} catch (err) {
			console.error('[pos terminal] payment creation failed', err);
			return fail(502, {
				error: err instanceof PosPaymentError ? ('unavailable' as const) : ('failed' as const)
			});
		}

		throw redirect(303, `/pos/terminal/payment/${id}`);
	}
};
