import { collections } from './database';
import { ObjectId, type ClientSession } from 'mongodb';
import type { AccountingLog } from '$lib/types/AccountingLog';
import { csvCell } from '$lib/utils/csvCell';

export function employeeFromLocals(locals: {
	user?: { _id: ObjectId; alias?: string };
}): Pick<AccountingLog, 'employee'> | Record<string, never> {
	return locals.user ? { employee: { userId: locals.user._id, alias: locals.user.alias } } : {};
}

export async function logAccountingEvent(
	params: Omit<AccountingLog, '_id' | 'createdAt'>,
	session?: ClientSession
): Promise<void> {
	try {
		await collections.accountingLogs.insertOne(
			{
				_id: new ObjectId(),
				...params,
				createdAt: new Date()
			},
			...(session ? [{ session }] : [])
		);
	} catch (err) {
		console.error(
			`Failed to write accounting log: ${params.eventType} for ${params.objectId}`,
			err
		);
	}
}

export async function logProductCreationEvents(
	slug: string,
	priceAmount: number,
	priceCurrency: string,
	vatProfileId: string | undefined,
	stock: number | undefined,
	locals: { user?: { _id: ObjectId; alias?: string } }
): Promise<void> {
	await logAccountingEvent({
		eventType: 'productPriceUpdate',
		objectType: 'product',
		objectId: slug,
		before: null,
		after: { amount: priceAmount, currency: priceCurrency },
		...employeeFromLocals(locals)
	});

	if (vatProfileId) {
		await logAccountingEvent({
			eventType: 'productVatUpdate',
			objectType: 'product',
			objectId: slug,
			before: null,
			after: vatProfileId,
			...employeeFromLocals(locals)
		});
	}

	if (stock !== undefined) {
		await logAccountingEvent({
			eventType: 'stockUpdate',
			objectType: 'product',
			objectId: slug,
			before: null,
			after: { total: stock },
			...employeeFromLocals(locals)
		});
	}
}

export function accountingLogsToCSV(logs: AccountingLog[]): string {
	const header = 'id,eventType,objectId,objectType,before,after,employeeId,employeeAlias,createdAt';
	const rows = logs.map((log) =>
		[
			log._id.toString(),
			log.eventType,
			csvCell(log.objectId),
			log.objectType,
			csvCell(JSON.stringify(log.before ?? null)),
			csvCell(JSON.stringify(log.after ?? null)),
			log.employee?.userId?.toString() ?? '',
			csvCell(log.employee?.alias ?? ''),
			log.createdAt.toISOString()
		].join(',')
	);
	return [header, ...rows].join('\n');
}
