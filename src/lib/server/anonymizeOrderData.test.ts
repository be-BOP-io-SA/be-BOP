import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb, insertTestOrder } from './test-utils';
import { collections } from './database';
import { anonymizeOrderData } from './orders';

describe('anonymizeOrderData and the API call journal', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('erases the personal checkout fields the journal copied, and only them', async () => {
		const order = await insertTestOrder({
			customCheckoutFields: [
				{
					fieldId: 'f-phone',
					slug: 'phone',
					name: 'phone',
					label: 'Phone',
					type: 'free',
					value: '+41 79 000 00 00',
					isPersonalData: true
				},
				{
					fieldId: 'f-table',
					slug: 'table',
					name: 'table',
					label: 'Table',
					type: 'free',
					value: '12'
				}
			]
		});
		const entryId = new ObjectId();
		await collections.apiV1Logs.insertOne({
			_id: entryId,
			createdAt: new Date(),
			method: 'GET',
			path: '/api/v1/orders/paid',
			status: 200,
			durationMs: 3,
			responseBody: JSON.stringify({
				orders: [
					{
						orderId: order._id,
						customFields: [
							{ slug: 'phone', source: 'shop', value: '+41 79 000 00 00', isPersonalData: true },
							{ slug: 'table', source: 'shop', value: '12' }
						]
					}
				]
			}),
			orderIds: [order._id]
		});

		await expect(anonymizeOrderData(order._id)).resolves.toBe(true);

		const entry = await collections.apiV1Logs.findOne({ _id: entryId });
		const fields = JSON.parse(entry?.responseBody ?? '{}').orders[0].customFields;
		expect(fields).toEqual([
			{ slug: 'phone', source: 'shop', value: '', isPersonalData: true },
			{ slug: 'table', source: 'shop', value: '12' }
		]);
	});
});
