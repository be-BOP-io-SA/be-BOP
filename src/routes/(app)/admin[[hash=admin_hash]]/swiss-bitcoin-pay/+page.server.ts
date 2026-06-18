import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	return {
		apiKey: runtimeConfig.swissBitcoinPay.apiKey,
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription
	};
};

export const actions: Actions = {
	save: async function ({ request }) {
		const swissBitcoinPay = z
			.object({
				apiKey: z.string().min(1)
			})
			.parse(Object.fromEntries(await request.formData()));
		await collections.runtimeConfig.updateOne(
			{
				_id: 'swissBitcoinPay'
			},
			{
				$set: {
					data: swissBitcoinPay,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		runtimeConfig.swissBitcoinPay = swissBitcoinPay;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'swissBitcoinPay'
		});
		runtimeConfig.swissBitcoinPay = {
			apiKey: ''
		};
	},
	updateLightningInvoiceDescription
};
