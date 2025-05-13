import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { z } from 'zod';

export async function load() {
	return {
		apiKey: runtimeConfig.swissBitcoinPay.apiKey
	};
}

export const actions = {
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
	}
};
