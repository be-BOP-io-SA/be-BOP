import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import {
	MAX_DESCRIPTION_LIMIT,
	MAX_NAME_LIMIT,
	MAX_SHORT_DESCRIPTION_LIMIT
} from '$lib/types/Product';
import type { Actions } from './$types';

export const actions: Actions = {
	update: async function ({ request, params }) {
		const countdown = await collections.countdowns.findOne({
			_id: params.id
		});
		if (!countdown) {
			throw error(404, 'Countdown not found');
		}
		const data = await request.formData();

		const parsed = z
			.object({
				name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				description: z.string().trim().min(1).max(MAX_DESCRIPTION_LIMIT),
				title: z.string().trim().min(1).max(MAX_SHORT_DESCRIPTION_LIMIT),
				endsAt: z.date({ coerce: true })
			})
			.parse(Object.fromEntries(data));

		await collections.countdowns.updateOne(
			{
				_id: countdown._id
			},
			{
				$set: {
					name: parsed.name,
					description: parsed.description,
					title: parsed.title,
					endsAt: parsed.endsAt,
					updatedAt: new Date()
				}
			}
		);
	},

	delete: async function ({ params }) {
		await collections.countdowns.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/countdown`);
	}
};
