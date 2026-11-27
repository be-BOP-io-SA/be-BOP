import { beforeAll, describe, expect, it, vi } from 'vitest';
import { addMinutes, subMinutes } from 'date-fns';
import type { Order } from '$lib/types/Order';
import { cleanDb, insertTestOrder } from '../test-utils';
import { collections } from '../database';
import { expireUnfollowedPayment } from '../orders';

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

	const overdue = () => subMinutes(new Date(), 1);
	const pendingTillPayment = (marked: boolean) =>
		insertTestOrder({
			status: 'pending',
			payments: [
				{
					status: 'pending',
					method: 'point-of-sale',
					expiresAt: overdue(),
					...(marked && { expireAtDeadline: true as const })
				}
			]
		});
	const statusOf = async (orderId: string) =>
		(await collections.orders.findOne({ _id: orderId }))?.status;

	it('expires an overdue payment marked for it, and no other payment without a processor', async () => {
		const unmarked = await pendingTillPayment(false);
		const marked = await pendingTillPayment(true);
		await vi.waitFor(async () => expect(await statusOf(marked._id)).toBe('expired'), {
			timeout: 10_000
		});

		// Written after the first expired: once it expires too, the unmarked order went through a
		// whole round of the routine.
		const later = await pendingTillPayment(true);
		await vi.waitFor(async () => expect(await statusOf(later._id)).toBe('expired'), {
			timeout: 10_000
		});

		expect(await statusOf(unmarked._id)).toBe('pending');
	}, 30_000);

	it('leaves a marked payment to the processor that follows it', async () => {
		const followed = await insertTestOrder({
			status: 'pending',
			payments: [{ ...pendingCardPayment(overdue()), expireAtDeadline: true }]
		});

		await expect(expireUnfollowedPayment(followed, followed.payments[0])).resolves.toBeNull();

		await vi.waitFor(() => expect(polled.orderIds).toContain(followed._id), { timeout: 10_000 });
		expect(await statusOf(followed._id)).toBe('pending');
	}, 30_000);
});
