import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { defaultConfig, runtimeConfig } from '$lib/server/runtime-config';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { actions } from './+page.server';

const CUSTOM = { subject: 'Custom reset', html: '<p>{{resetLink}}</p>', default: false };

function reset(key: string, roleId: string) {
	const body = new FormData();
	body.set('key', key);
	return actions.reset({
		request: new Request('http://localhost/admin/template/emails?/reset', { method: 'POST', body }),
		locals: { user: { roleId } }
	} as unknown as Parameters<typeof actions.reset>[0]);
}

describe('email template reset', () => {
	const templates = runtimeConfig.emailTemplates;

	beforeEach(async () => {
		await cleanDb();
		runtimeConfig.emailTemplates = { ...templates, passwordReset: CUSTOM };
	});

	afterEach(() => {
		runtimeConfig.emailTemplates = templates;
	});

	it('leaves a sign-in template to the super admin', async () => {
		const result = await reset('passwordReset', 'admin');

		expect(result).toMatchObject({ status: 403 });
		expect(runtimeConfig.emailTemplates.passwordReset).toEqual(CUSTOM);
	});

	it('lets the super admin reset a sign-in template', async () => {
		await reset('passwordReset', SUPER_ADMIN_ROLE_ID);

		expect(runtimeConfig.emailTemplates.passwordReset).toEqual(
			defaultConfig.emailTemplates.passwordReset
		);
	});

	it('lets any admin reset another template', async () => {
		runtimeConfig.emailTemplates = {
			...runtimeConfig.emailTemplates,
			'order.paid': { ...CUSTOM, subject: 'Custom paid' }
		};

		await reset('order.paid', 'admin');

		expect(runtimeConfig.emailTemplates['order.paid']).toEqual(
			defaultConfig.emailTemplates['order.paid']
		);
	});
});
