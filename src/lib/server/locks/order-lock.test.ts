import { beforeAll, describe, expect, it, vi } from 'vitest';
import { addMinutes, subMinutes } from 'date-fns';
import type { Order } from '$lib/types/Order';
import { cleanDb, insertTestOrder } from '../test-utils';

const polled = vi.hoisted(() => ({ orderIds: [] as string[], raceOrderId: '' }));

vi.mock('../lock', () => ({
	Lock: class {
		ownsLock = true;
	}
}));

vi.mock('../sdk/pp', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../sdk/pp')>();
	const { collections } = await import('../database');
	return {
		...actual,
		getProcessor: () => ({
			meta: { processor: 'stripe', method: 'card' },
			isEnabled: () => true,
			async checkPayment(payment: Order['payments'][number], order: Order) {
				polled.orderIds.push(order._id);
				if (order._id === polled.raceOrderId) {
					// The buyer cancels on the order page while the poller holds its stale copy.
					await collections.orders.updateOne(
						{ _id: order._id, 'payments._id': payment._id },
						{ $set: { 'payments.$.status': 'canceled' } }
					);
					return { status: 'expired' };
				}
				return { status: 'pending' };
			}
		})
	};
});

const pendingCardPayment = (expiresAt: Date) => ({
	status: 'pending' as const,
	method: 'card' as const,
	processor: 'stripe' as const,
	checkoutId: 'checkout',
	expiresAt
});

describe('order poller', () => {
	beforeAll(async () => {
		await cleanDb();
		const raced = await insertTestOrder({
			status: 'pending',
			payments: [pendingCardPayment(subMinutes(new Date(), 1))]
		});
		polled.raceOrderId = raced._id;
		await import('./order-lock');
	});

	it('keeps polling other orders after a payment was settled under its feet', async () => {
		await vi.waitFor(() => expect(polled.orderIds).toContain(polled.raceOrderId), {
			timeout: 10_000
		});

		const next = await insertTestOrder({
			status: 'pending',
			payments: [pendingCardPayment(addMinutes(new Date(), 30))]
		});

		await vi.waitFor(() => expect(polled.orderIds).toContain(next._id), { timeout: 10_000 });
	}, 30_000);
});
