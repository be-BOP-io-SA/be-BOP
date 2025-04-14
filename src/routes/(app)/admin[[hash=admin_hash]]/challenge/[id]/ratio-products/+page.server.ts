import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import { collections } from '$lib/server/database.js';

export const actions = {
	default: async function ({ request, params }) {
		const formData = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of formData.entries()) {
			const match = key.match(/^perProductRatio\[(.+?)\]$/);
			if (match) {
				json[match[1]] = Number(value);
			}
		}

		const perProductRatio = z.record(z.string(), z.number().min(0).max(100)).parse(json);

		await collections.challenges.updateOne(
			{
				_id: params.id
			},
			{
				$set: {
					perProductRatio,
					updatedAt: new Date()
				}
			}
		);
	}
};
