import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { recordUnderpayment } from './underpayment';

describe('recordUnderpayment', () => {
	beforeEach(cleanDb);

	it('leaves one system note on the order, however often the poller sees it', async () => {
		const order = await insertTestOrder({
			status: 'pending',
			payments: [{ status: 'pending', price: { amount: 100, currency: 'EUR' } }]
		});
		const payment = order.payments[0];
		const received = { amount: 99.98, currency: 'EUR' as const };

		await recordUnderpayment(order, payment, 'phoenixd', received);
		await recordUnderpayment(order, payment, 'phoenixd', received);

		const notes = (await collections.orders.findOne({ _id: order._id }))?.notes ?? [];
		expect(notes.map(({ role, content }) => ({ role, content }))).toEqual([
			{
				role: null,
				content: `phoenixd reported payment ${payment._id.toHexString()} settled with 99.98 EUR, short of the 100 EUR asked. The payment stays pending and expires unless the rest arrives.`
			}
		]);
	});
});
