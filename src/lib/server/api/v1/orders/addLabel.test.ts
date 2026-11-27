import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { addOrderLabel } from './addLabel';

describe('addOrderLabel, for a key restricted to its own orders', () => {
	const ownKey = new ObjectId();
	const otherKey = new ObjectId();

	beforeEach(async () => {
		await cleanDb();
	});

	async function labelsOf(orderId: string) {
		return (await collections.orders.findOne({ _id: orderId }))?.orderLabelIds ?? [];
	}

	it('labels an order the key wrote', async () => {
		const order = await insertTestOrder({ externalSourceApiKeyId: ownKey });

		const result = await addOrderLabel({ orderId: order._id, labelId: 'vip', ownedBy: ownKey });

		expect(result).toMatchObject({ ok: true, labels: [{ id: 'vip', name: 'vip' }] });
		expect(await labelsOf(order._id)).toEqual(['vip']);
	});

	it('does not find an order another key wrote, nor one placed in the shop', async () => {
		const ofOtherKey = await insertTestOrder({ externalSourceApiKeyId: otherKey });
		const ofTheShop = await insertTestOrder();

		for (const order of [ofOtherKey, ofTheShop]) {
			await expect(
				addOrderLabel({ orderId: order._id, labelId: 'vip', ownedBy: ownKey })
			).resolves.toEqual({ ok: false, reason: 'ORDER_NOT_FOUND' });
			expect(await labelsOf(order._id)).toEqual([]);
		}
		// Refused before anything is written: the label is not created either.
		expect(await collections.labels.countDocuments({ _id: 'vip' })).toBe(0);
	});

	it('labels any order for a key that is not restricted', async () => {
		const order = await insertTestOrder({ externalSourceApiKeyId: otherKey });

		await expect(addOrderLabel({ orderId: order._id, labelId: 'vip' })).resolves.toMatchObject({
			ok: true
		});
		expect(await labelsOf(order._id)).toEqual(['vip']);
	});
});
