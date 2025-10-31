import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error } from '@sveltejs/kit';
import type { PosSession } from '$lib/types/PosSession';
import type { Filter } from 'mongodb';

export const load = async ({ url }: { url: URL }) => {
	if (!runtimeConfig.posSession.enabled) {
		throw error(403, 'POS sessions are not enabled');
	}

	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');

	const filter: Filter<PosSession> = {};

	if (dateFrom) {
		filter.openedAt = { $gte: new Date(dateFrom) };
	}

	if (dateTo) {
		const toDate = new Date(dateTo);
		toDate.setHours(23, 59, 59, 999);
		filter.openedAt = { ...filter.openedAt, $lte: toDate };
	}

	const sessions = await collections.posSessions
		.find(filter)
		.sort({ openedAt: -1 })
		.limit(100)
		.toArray();

	const sessionsWithStats = sessions.map((session: PosSession) => {
		const duration = session.closedAt
			? session.closedAt.getTime() - session.openedAt.getTime()
			: Date.now() - session.openedAt.getTime();

		const totalIncome = session.dailyIncomes?.reduce((sum, income) => sum + income.amount, 0) ?? 0;
		const hasCashDelta = session.cashDelta && Math.abs(session.cashDelta.amount) > 0.01;

		return {
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
			xTicketsCount: session.xTickets?.length ?? 0,
			totalIncome,
			hasCashDelta,
			cashDelta: session.cashDelta ?? null,
			duration: Math.floor(duration / 1000 / 60)
		};
	});

	return {
		sessions: sessionsWithStats,
		dateFrom: dateFrom ?? '',
		dateTo: dateTo ?? ''
	};
};
