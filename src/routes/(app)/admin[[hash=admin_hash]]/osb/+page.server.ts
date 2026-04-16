import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { z } from 'zod';

export async function load() {
	return {
		osb: runtimeConfig.osb
	};
}

export const actions = {
	save: async function ({ request }) {
		const osb = z
			.object({
				shopId: z.string().min(1),
				password: z.string().min(1),
				hmacKey: z.string().default('')
			})
			.parse(Object.fromEntries(await request.formData()));

		await collections.runtimeConfig.updateOne(
			{
				_id: 'osb'
			},
			{
				$set: {
					data: osb,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.osb = osb;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'osb'
		});

		runtimeConfig.osb = {
			shopId: '',
			password: '',
			hmacKey: ''
		};
	}
};
