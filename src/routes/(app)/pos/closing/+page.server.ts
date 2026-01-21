import {
	closePosSession,
	getCurrentPosSession,
	calculateDailyIncomes,
	calculateTotalCashback
} from '$lib/server/pos-sessions';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { CURRENCIES } from '$lib/types/Currency';
import { z } from 'zod';
import type { Actions } from './$types';

export const load = async ({ locals }: { locals: App.Locals }) => {
	const posSession = await getCurrentPosSession();

	if (!posSession) {
		throw error(404, 'No active POS session');
	}

	const dailyIncomes = await calculateDailyIncomes(posSession);
	const cashbackTotal = await calculateTotalCashback(posSession);

	return {
		session: {
			_id: posSession._id.toString(),
			openedAt: posSession.openedAt,
			cashOpening: posSession.cashOpening
		},
		incomes: dailyIncomes.map((inc) => ({
			paymentMethod: inc.paymentMethod,
			paymentSubtype: inc.paymentSubtype,
			amount: inc.amount,
			currency: inc.currency
		})),
		cashbackTotal: cashbackTotal.amount,
		cashDeltaJustificationMandatory: runtimeConfig.posSession.cashDeltaJustificationMandatory,
		user: locals.user
			? {
					alias: locals.user.alias,
					login: locals.user.login
			  }
			: null
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();

		const parsed = z
			.object({
				sessionId: z.string(),
				cashClosingAmount: z.number({ coerce: true }).nonnegative(),
				bankDepositAmount: z.number({ coerce: true }).nonnegative(),
				justification: z.string().nullish(),
				currency: z.enum(CURRENCIES)
			})
			.parse({
				sessionId: formData.get('sessionId'),
				cashClosingAmount: formData.get('cashClosingAmount'),
				bankDepositAmount: formData.get('bankDepositAmount'),
				justification: formData.get('justification'),
				currency: formData.get('currency')
			});

		const sessionId = new ObjectId(parsed.sessionId);

		await closePosSession({
			sessionId,
			cashClosing: {
				amount: parsed.cashClosingAmount,
				currency: parsed.currency
			},
			outcomes: [
				{
					category: 'bank-deposit',
					amount: parsed.bankDepositAmount,
					currency: parsed.currency
				}
			],
			cashDeltaJustification: parsed.justification ?? undefined,
			user: {
				userId: locals.user._id,
				userLogin: locals.user.login,
				userAlias: locals.user.alias
			}
		});

		throw redirect(303, `/pos/history/${sessionId.toString()}/z-ticket?justClosed=true`);
	}
};
