import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestEvent } from '@sveltejs/kit';
import { POS_OPERATOR_COOKIE, terminalKeyOf } from '$lib/server/api/pos-terminal';
import { operatorOfSession } from '$lib/server/arm-pos';
import { collections } from '$lib/server/database';
import {
	calculateDailyIncomes,
	calculateTotalCashback,
	closePosSession,
	getCurrentPosSession,
	getLastClosedSession,
	openPosSession
} from '$lib/server/pos-sessions';
import { runtimeConfig } from '$lib/server/runtime-config';

/**
 * Opening and closing of the till session from a paired terminal, as on /pos/opening and
 * /pos/closing, for an operator allowed to edit the Z ticket.
 */
async function tillOperator(event: RequestEvent) {
	const apiKey = await terminalKeyOf(event);
	if (!apiKey) {
		throw error(401, 'This device is not paired with the shop, or it was revoked.');
	}
	const operator = await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKey._id);
	if (!operator?.actions.includes('zReport')) {
		throw error(403, 'You are not allowed to open or close the till.');
	}
	const user = await collections.users.findOne({ _id: operator._id });
	return {
		userId: operator._id,
		userLogin: user?.login ?? operator.alias,
		userAlias: operator.alias
	};
}

export async function load(event) {
	await tillOperator(event);
	const currency = runtimeConfig.mainCurrency;
	if (!runtimeConfig.posSession.enabled) {
		return { enabled: false as const, currency };
	}

	const session = await getCurrentPosSession();
	if (!session) {
		const last = await getLastClosedSession();
		return {
			enabled: true as const,
			currency,
			session: null,
			lastClosing: last?.cashClosing ?? null
		};
	}

	const incomes = await calculateDailyIncomes(session);
	return {
		enabled: true as const,
		currency,
		session: {
			id: session._id.toHexString(),
			openedAt: session.openedAt,
			cashOpening: session.cashOpening
		},
		cashIncome: incomes
			.filter((i) => i.paymentSubtype === 'cash')
			.reduce((sum, i) => sum + i.amount, 0),
		cashbackTotal: (await calculateTotalCashback(session)).amount,
		justificationMandatory: runtimeConfig.posSession.cashDeltaJustificationMandatory
	};
}

export const actions = {
	async open(event) {
		const user = await tillOperator(event);
		const amount = z
			.number({ coerce: true })
			.nonnegative()
			.safeParse((await event.request.formData()).get('amount'));
		if (!amount.success) {
			return fail(400, { tillError: 'amount' as const });
		}
		await openPosSession({
			cashOpening: { amount: amount.data, currency: runtimeConfig.mainCurrency },
			user
		});
	},

	async close(event) {
		const user = await tillOperator(event);
		const session = await getCurrentPosSession();
		if (!session) {
			return fail(400, { tillError: 'noSession' as const });
		}
		const parsed = z
			.object({
				cashClosingAmount: z.number({ coerce: true }).nonnegative(),
				bankDepositAmount: z.number({ coerce: true }).nonnegative(),
				justification: z.string().trim().optional()
			})
			.safeParse(Object.fromEntries(await event.request.formData()));
		if (!parsed.success) {
			return fail(400, { tillError: 'amount' as const });
		}
		const currency = session.cashOpening.currency;
		const { zTicketText } = await closePosSession({
			sessionId: session._id,
			cashClosing: { amount: parsed.data.cashClosingAmount, currency },
			outcomes: [{ category: 'bank-deposit', amount: parsed.data.bankDepositAmount, currency }],
			cashDeltaJustification: parsed.data.justification || undefined,
			user
		});
		return { zTicket: zTicketText };
	}
};
