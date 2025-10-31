import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { calculateDailyIncomes } from '$lib/server/pos-sessions';

export const load = async ({ params }: { params: { id: string } }) => {
	if (!runtimeConfig.posSession.enabled) {
		throw error(403, 'POS sessions are not enabled');
	}

	const session = await collections.posSessions.findOne({ _id: new ObjectId(params.id) });

	if (!session) {
		throw error(404, 'Session not found');
	}

	if (session.status === 'active') {
		throw error(400, 'Cannot view details of active session');
	}

	const dailyIncomes = await calculateDailyIncomes(session);
	const incomes = dailyIncomes.map((inc) => ({
		paymentMethod: inc.paymentMethod,
		paymentSubtype: inc.paymentSubtype,
		amount: inc.amount,
		currency: inc.currency
	}));

	const duration = session.closedAt
		? session.closedAt.getTime() - session.openedAt.getTime()
		: Date.now() - session.openedAt.getTime();

	return {
		session: {
			_id: session._id.toString(),
			status: session.status,
			openedAt: session.openedAt,
			closedAt: session.closedAt ?? null,
			openedBy: {
				alias: session.openedBy.userAlias,
				login: session.openedBy.userLogin
			},
			closedBy: session.closedBy
				? {
						alias: session.closedBy.userAlias,
						login: session.closedBy.userLogin
				  }
				: null,
			cashOpening: session.cashOpening,
			cashClosing: session.cashClosing ?? null,
			cashClosingTheoretical: session.cashClosingTheoretical ?? null,
			cashDelta: session.cashDelta ?? null,
			cashDeltaJustification: session.cashDeltaJustification ?? null,
			dailyOutcomes: session.dailyOutcomes ?? [],
			xTickets: (session.xTickets ?? []).map((ticket) => ({
				generatedAt: ticket.generatedAt,
				generatedBy: {
					userId: ticket.generatedBy.userId?.toString() ?? null,
					userLogin: ticket.generatedBy.userLogin,
					userAlias: ticket.generatedBy.userAlias
				}
			})),
			duration: Math.floor(duration / 1000 / 60)
		},
		incomes
	};
};
