import { collections } from '$lib/server/database';
import { accountingLogsToCSV } from '$lib/server/accounting-log';
import type { Filter } from 'mongodb';
import type { AccountingLog } from '$lib/types/AccountingLog';
import { z } from 'zod';

export const GET = async ({ url }) => {
	const format = z.enum(['csv', 'json']).catch('csv').parse(url.searchParams.get('format'));
	const from = url.searchParams.get('from');
	const to = url.searchParams.get('to');

	const filter: Filter<AccountingLog> = {};
	if (from || to) {
		filter.createdAt = {
			...(from && { $gte: new Date(from) }),
			...(to && { $lte: new Date(to) })
		};
	}

	const logs = await collections.accountingLogs.find(filter).sort({ createdAt: 1 }).toArray();

	const date = new Date().toISOString().slice(0, 10);

	if (format === 'json') {
		return new Response(JSON.stringify(logs, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename=accounting-changelog-${date}.json`
			}
		});
	}

	return new Response(accountingLogsToCSV(logs), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename=accounting-changelog-${date}.csv`
		}
	});
};
