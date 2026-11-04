import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { actions } from './+page.server';

async function send(from: string, clientIp: string) {
	const body = new FormData();
	body.set('subject', 'Hello');
	body.set('content', 'A question');
	body.set('from', from);
	try {
		return await actions.sendEmail({
			request: new Request('http://x/form/contact?/sendEmail', { method: 'POST', body }),
			locals: { clientIp },
			params: { id: 'contact' }
		} as unknown as Parameters<typeof actions.sendEmail>[0]);
	} catch (thrown) {
		return thrown;
	}
}

describe('contact form', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.contactForms.insertOne({
			_id: 'contact',
			title: 'Contact',
			subject: 'Hello',
			content: '',
			target: 'owner@shop.example',
			displayFromField: true,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	it.each([
		['left empty', '', 'non-renseigné'],
		['an npub', 'npub1visitor', 'npub1visitor'],
		['an e-mail address', 'visitor@example.com', 'visitor@example.com'],
		['free text', 'Jean, call me back', 'Jean, call me back']
	])('sends the message when the sender is %s', async (_, from, shown) => {
		const result = await send(from, `10.0.0.${from.length}`);

		expect(result).toMatchObject({ status: 303 });
		const sent = await collections.emailNotifications.findOne({});
		expect(sent?.htmlContent).toContain(`Adresse de contact : ${shown} `);
	});

	it('escapes markup the sender typed in the from field', async () => {
		await send('<b>x</b>', '10.0.1.1');

		const sent = await collections.emailNotifications.findOne({});
		expect(sent?.htmlContent).toContain('Adresse de contact : &lt;b&gt;x&lt;/b&gt; ');
	});
});
