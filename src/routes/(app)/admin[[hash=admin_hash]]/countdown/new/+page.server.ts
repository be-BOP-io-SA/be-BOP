import { collections } from '$lib/server/database';
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import {
	MAX_DESCRIPTION_LIMIT,
	MAX_NAME_LIMIT,
	MAX_SHORT_DESCRIPTION_LIMIT
} from '$lib/types/Product';
import { adminPrefix } from '$lib/server/admin';
import { zodSlug } from '$lib/server/zod';

export const load: PageServerLoad = async () => {};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const parsed = z
			.object({
				slug: zodSlug(),
				name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				description: z.string().trim().min(1).max(MAX_DESCRIPTION_LIMIT),
				title: z.string().trim().min(1).max(MAX_SHORT_DESCRIPTION_LIMIT),
				endsAt: z.date({ coerce: true })
			})
			.parse(Object.fromEntries(formData));

		if (await collections.specifications.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'Countdown with same slug already exists');
		}

		await collections.countdowns.insertOne({
			_id: parsed.slug,
			name: parsed.name,
			description: parsed.description,
			title: parsed.title,
			endsAt: parsed.endsAt,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		throw redirect(303, `${adminPrefix()}/countdown/${parsed.slug}`);
	}
};
