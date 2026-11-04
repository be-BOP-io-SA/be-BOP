import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import type { Discount } from '$lib/types/Discount';
import { actions } from './+page.server';

type ReplaceEvent = Parameters<(typeof actions)['replaceMethod']>[0];

describe('replace the payment method of a discounted order', () => {
	beforeEach(cleanDb);

	it('answers with a code the page translates, not an English error page', async () => {
		await collections.discounts.insertOne({
			_id: 'card-only',
			name: 'Card only',
			paymentMethods: ['card'],
			productIds: [],
			wholeCatalog: true,
			beginsAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date()
		} as unknown as Discount);
		const order = await insertTestOrder({
			status: 'pending',
			appliedAutoDiscountId: 'card-only',
			payments: [{ status: 'pending', method: 'card' }]
		});

		const body = new FormData();
		body.set('method', 'bitcoin');
		const result = await actions.replaceMethod({
			params: { id: order._id, paymentId: order.payments[0]._id.toString() },
			request: new Request('http://x/order', { method: 'POST', body }),
			locals: {}
		} as unknown as ReplaceEvent);

		expect(result).toMatchObject({ status: 400, data: { discountTiedToPaymentMethod: true } });
	});
});
