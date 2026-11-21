import { fail, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import {
	POS_OPERATOR_COOKIE,
	operatorCookieOptions,
	terminalKeyOf
} from '$lib/server/api/pos-terminal';
import {
	closeOperatorSession,
	openOperatorSession,
	operatorFromBadge,
	operatorFromPin,
	operatorOfSession,
	terminalOperators
} from '$lib/server/arm-pos';
import {
	PosPaymentError,
	createPosPayment,
	terminalPaymentMethods
} from '$lib/server/pos-payments';
import { runtimeConfig } from '$lib/server/runtime-config';
import { collections } from '$lib/server/database';
import { ALL_PAYMENT_METHODS } from '$lib/server/payment-methods';

/**
 * The payment screen of a paired terminal: amount, tip, the till's reference, then how the
 * customer pays. The app opens it once with `Authorization: Bearer <API key>`; a cookie then
 * keeps the terminal signed in on the pages that follow. An operator signs in first (arm-pos).
 */
export async function load(event) {
	const apiKey = await terminalKeyOf(event);

	if (!apiKey) {
		return { paired: false as const };
	}

	const operator = await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKey._id);
	if (!operator) {
		return {
			paired: true as const,
			deviceName: apiKey.name,
			locked: true as const,
			operators: (await terminalOperators()).map((o) => ({
				id: o._id.toHexString(),
				alias: o.alias
			}))
		};
	}

	// A payment left waiting when its screen was quit: the terminal can go back to it.
	const pending = await collections.posPayments
		.find({ 'device.apiKeyId': apiKey._id, 'payment.status': 'pending' })
		.sort({ createdAt: -1 })
		.limit(20)
		.toArray();

	return {
		paired: true as const,
		deviceName: apiKey.name,
		locked: false as const,
		pending: pending.map((p) => ({
			id: p._id.toHexString(),
			number: p.number,
			price: p.payment.price,
			method: p.payment.method,
			externalRef: p.externalRef
		})),
		operator: { alias: operator.alias, actions: operator.actions },
		currency: runtimeConfig.mainCurrency,
		methods: operator.actions.includes('charge') ? terminalPaymentMethods() : []
	};
}

export const actions = {
	async unlock(event) {
		const apiKey = await terminalKeyOf(event);
		if (!apiKey) {
			return fail(401, { error: 'notPaired' as const });
		}
		const data = await event.request.formData();
		const operatorId = String(data.get('operatorId') ?? '');
		const pin = String(data.get('pin') ?? '');
		const badge = String(data.get('badge') ?? '');
		const operator = badge
			? await operatorFromBadge(badge)
			: ObjectId.isValid(operatorId)
			? await operatorFromPin(new ObjectId(operatorId), pin)
			: null;
		if (!operator) {
			return fail(403, { error: 'wrongCredentials' as const });
		}
		event.cookies.set(
			POS_OPERATOR_COOKIE,
			await openOperatorSession(apiKey._id, operator._id),
			operatorCookieOptions
		);
	},

	async lock(event) {
		await closeOperatorSession(event.cookies.get(POS_OPERATOR_COOKIE));
		event.cookies.delete(POS_OPERATOR_COOKIE, { path: '/' });
	},

	async pay(event) {
		const apiKey = await terminalKeyOf(event);
		if (!apiKey) {
			return fail(401, { error: 'notPaired' as const });
		}
		const operator = await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKey._id);
		if (!operator?.actions.includes('charge')) {
			return fail(403, { error: 'notAllowed' as const });
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
		if (!parsed.data.externalRef?.trim() && !operator.actions.includes('tillDown')) {
			return fail(403, { error: 'notAllowed' as const });
		}

		let id: string;
		try {
			const posPayment = await createPosPayment({
				device: { apiKeyId: apiKey._id, name: apiKey.name },
				operator: { userId: operator._id, alias: operator.alias },
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
