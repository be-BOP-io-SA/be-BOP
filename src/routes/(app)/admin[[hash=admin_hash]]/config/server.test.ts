import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { resetConfig, runtimeConfig } from '$lib/server/runtime-config';
import '$lib/server/sdk/pp-registry';
import { actions } from './+page.server';

// The fields the page always posts, set to what is saved; boxes left out are unticked.
function formOfSavedSettings(): FormData {
	const body = new FormData();
	body.set('maintenanceIps', runtimeConfig.maintenanceIps);
	body.set('mainCurrency', runtimeConfig.mainCurrency);
	body.set('priceReferenceCurrency', runtimeConfig.priceReferenceCurrency);
	body.set('subscriptionDuration', runtimeConfig.subscriptionDuration);
	body.set('subscriptionReminderSeconds', String(runtimeConfig.subscriptionReminderSeconds));
	body.set('desiredPaymentTimeout', String(runtimeConfig.desiredPaymentTimeout));
	body.set('reserveStockInMinutes', String(runtimeConfig.reserveStockInMinutes));
	body.set('analyticsScriptSnippet', runtimeConfig.analyticsScriptSnippet);
	body.set('adminHash', runtimeConfig.adminHash);
	body.set('preferredProcessorCard', '');
	body.set('preferredProcessorBitcoin', '');
	body.set('preferredProcessorLightning', '');
	return body;
}

async function save(body: FormData) {
	await actions.update({
		request: new Request('http://x/admin/config', { method: 'POST', body }),
		locals: {}
	} as Parameters<typeof actions.update>[0]);
}

describe('admin config order e-mail recipients', () => {
	beforeEach(async () => {
		await cleanDb();
		resetConfig();
		runtimeConfig.orderEmailRecipients = {};
	});

	afterEach(resetConfig);

	it('keeps the copies to the owner when the shop has no contact address', async () => {
		runtimeConfig.sellerIdentity = null;
		runtimeConfig.copyOrderEmailsToAdmin = true;

		await save(formOfSavedSettings());

		expect(runtimeConfig.copyOrderEmailsToAdmin).toBe(true);
		expect(runtimeConfig.orderEmailRecipients['order.paid']?.shop).toBe(true);
	});

	it('keeps the locked customer e-mails on when their boxes are not posted', async () => {
		runtimeConfig.sellerIdentity = {
			contact: { email: 'shop@example.com' }
		} as typeof runtimeConfig.sellerIdentity;

		await save(formOfSavedSettings());

		expect(runtimeConfig.orderEmailRecipients['order.paid']?.customer).toBe(true);
		expect(runtimeConfig.orderEmailRecipients['order.payment.expired']?.customer).toBe(true);
		expect(runtimeConfig.orderEmailRecipients['order.payment.pending.card']?.customer).toBe(false);
	});
});
