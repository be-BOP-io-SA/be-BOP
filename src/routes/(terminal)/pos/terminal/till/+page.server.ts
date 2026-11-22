import { error, fail, redirect } from '@sveltejs/kit';
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
 * /pos/closing, for an operator allowed to edit the Z ticket. A terminal takes no cash, so
 * neither asks for any: the till opens on the cash of the last closing and closes on the cash
 * it expects.
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
	if (!runtimeConfig.posSession.enabled) {
		return { enabled: false as const };
	}

	const session = await getCurrentPosSession();
	if (!session) {
		return {
			enabled: true as const,
			session: null,
			// While it is closed, the payment screen sends everyone here: no way back from this page.
			forbidTouchWhenClosed: runtimeConfig.posSession.forbidTouchWhenSessionClosed
		};
	}

	return { enabled: true as const, session: { openedAt: session.openedAt } };
}

export const actions = {
	async open(event) {
		const user = await tillOperator(event);
		const last = await getLastClosedSession();
		await openPosSession({
			cashOpening: last?.cashClosing ?? { amount: 0, currency: runtimeConfig.mainCurrency },
			user
		});
		// The till is open: back to the payment screen.
		throw redirect(303, '/pos/terminal');
	},

	async close(event) {
		const user = await tillOperator(event);
		const session = await getCurrentPosSession();
		if (!session) {
			return fail(400, { tillError: 'noSession' as const });
		}
		const currency = session.cashOpening.currency;
		// The same count as /pos/closing: opening cash, plus cash taken, minus what left the drawer.
		const cashIncome = (await calculateDailyIncomes(session))
			.filter((income) => income.paymentSubtype === 'cash')
			.reduce((sum, income) => sum + income.amount, 0);
		const expected =
			session.cashOpening.amount + cashIncome - (await calculateTotalCashback(session)).amount;
		const { zTicketText } = await closePosSession({
			sessionId: session._id,
			cashClosing: { amount: Math.round(expected * 100) / 100, currency },
			outcomes: [{ category: 'bank-deposit', amount: 0, currency }],
			user
		});
		return { zTicket: zTicketText };
	}
};
