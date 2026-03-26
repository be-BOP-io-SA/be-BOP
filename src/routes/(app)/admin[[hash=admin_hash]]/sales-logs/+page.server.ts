import { collections } from '$lib/server/database';
import { subDays } from 'date-fns';
import { z } from 'zod';

export async function load({ url }) {
	const querySchema = z.object({
		from: z.date({ coerce: true }).default(subDays(new Date(), 1)),
		to: z.date({ coerce: true }).default(new Date())
	});

	const { from, to } = querySchema.parse(Object.fromEntries(url.searchParams.entries()));

	const logs = await collections.accountingLogs
		.find({
			createdAt: { $gte: from, $lte: to }
		})
		.sort({ createdAt: -1 })
		.limit(500)
		.toArray();

	const totalCount = await collections.accountingLogs.countDocuments({
		createdAt: { $gte: from, $lte: to }
	});

	return {
		logs: logs.map((log) => ({
			_id: log._id.toString(),
			eventType: log.eventType,
			objectId: log.objectId,
			objectType: log.objectType,
			before: log.before,
			after: log.after,
			createdAt: log.createdAt,
			employee: log.employee
				? { userId: log.employee.userId.toString(), alias: log.employee.alias }
				: undefined
		})),
		totalCount,
		from,
		to
	};
}
