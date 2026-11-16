import { beforeEach, describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { cleanDb } from '$lib/server/test-utils';
import { runtimeConfig } from '$lib/server/runtime-config';
import { actions } from './+page.server';

function postDescription(pspSlug: string) {
	return {
		params: { pspSlug },
		request: new Request('http://localhost/', {
			method: 'POST',
			body: new URLSearchParams({ qrCodeDescription: 'orderUrl' })
		})
	} as unknown as RequestEvent;
}

describe('updateLightningInvoiceDescription on the shared processor page', () => {
	beforeEach(async () => {
		await cleanDb();
		runtimeConfig.lightningQrCodeDescription = 'none';
	});

	it('refuses to change the setting from a non-lightning processor', async () => {
		await expect(
			actions.updateLightningInvoiceDescription(postDescription('paypal'))
		).rejects.toMatchObject({
			status: 404
		});

		expect(runtimeConfig.lightningQrCodeDescription).toBe('none');
	});

	it('changes the setting from a lightning processor', async () => {
		await actions.updateLightningInvoiceDescription(postDescription('blink'));

		expect(runtimeConfig.lightningQrCodeDescription).toBe('orderUrl');
	});
});
