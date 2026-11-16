import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import type { Schedule } from '$lib/types/Schedule';
import { actions } from './+page.server';

function schedule(_id: string, allowSubscription: boolean): Schedule {
	return {
		_id,
		name: _id,
		pastEventDelay: 60,
		displayPastEvents: false,
		displayPastEventsAfterFuture: false,
		sortByEventDateDesc: false,
		allowSubscription,
		events: [],
		createdAt: new Date(),
		updatedAt: new Date()
	} as Schedule;
}

/** Posts the form of the visited schedule, with whatever `scheduleId` the request carries. */
function subscribe(visitedId: string, fields: Record<string, string>) {
	const body = new FormData();
	for (const [key, value] of Object.entries(fields)) {
		body.set(key, value);
	}
	return actions.addSubscription({
		params: { id: visitedId },
		request: new Request('http://localhost/schedule/subscribe', { method: 'POST', body })
	} as unknown as Parameters<typeof actions.addSubscription>[0]);
}

describe('schedule subscription', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.schedules.insertMany([schedule('open', true), schedule('closed', false)]);
	});

	it('subscribes an address to the schedule being visited', async () => {
		await subscribe('open', { address: 'visitor@example.com', scheduleId: 'open' });

		const info = await collections.personalInfo.findOne({ 'user.email': 'visitor@example.com' });
		expect(info?.subscribedSchedule).toEqual(['open']);
	});

	it('refuses a schedule that does not accept subscriptions', async () => {
		await expect(
			subscribe('closed', { address: 'visitor@example.com', scheduleId: 'closed' })
		).rejects.toMatchObject({ status: 403 });
	});

	it('ignores another schedule named in the form', async () => {
		await expect(
			subscribe('closed', { address: 'visitor@example.com', scheduleId: 'open' })
		).rejects.toMatchObject({ status: 403 });
		expect(await collections.personalInfo.countDocuments()).toBe(0);
	});
});
