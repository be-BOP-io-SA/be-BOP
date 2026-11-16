import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import type { Schedule } from '$lib/types/Schedule';
import { GET } from './+server';

const MALICIOUS_SLUG = '"><a:script xmlns:a="http://www.w3.org/1999/xhtml">alert(1)</a:script>';

function schedule(event: { title: string; slug: string; shortDescription?: string }): Schedule {
	return {
		_id: 'agenda',
		name: 'Agenda & co',
		pastEventDelay: 60,
		displayPastEvents: false,
		displayPastEventsAfterFuture: false,
		sortByEventDateDesc: false,
		allowSubscription: false,
		events: [{ beginsAt: new Date(), ...event }],
		createdAt: new Date(),
		updatedAt: new Date()
	} as Schedule;
}

async function feed() {
	const res = await GET({ params: { id: 'agenda' } } as Parameters<typeof GET>[0]);
	return res.text();
}

describe('GET /schedule/[id]/rss.xml', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('does not let an event slug inject markup into the feed', async () => {
		await collections.schedules.insertOne(schedule({ title: 'Talk', slug: MALICIOUS_SLUG }));

		const xml = await feed();

		expect(xml).not.toContain('<a:script');
		expect(xml).toContain('&lt;a:script');
	});

	it('escapes ampersands and quotes in the text fields', async () => {
		await collections.schedules.insertOne(
			schedule({ title: 'Tom & "Jerry" <b>', slug: 'talk', shortDescription: 'a & b' })
		);

		const xml = await feed();

		expect(xml).toContain('<title>Agenda &amp; co</title>');
		expect(xml).toContain('<title>Tom &amp; &quot;Jerry&quot; &lt;b&gt;</title>');
		expect(xml).toContain('<description>a &amp; b</description>');
	});

	it('leaves plain values unchanged', async () => {
		await collections.schedules.insertOne(schedule({ title: 'Talk', slug: 'talk-1' }));

		const xml = await feed();

		expect(xml).toContain('/schedule/agenda/event/talk-1</guid>');
	});
});
