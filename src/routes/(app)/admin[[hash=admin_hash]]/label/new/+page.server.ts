import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import { adminPrefix } from '$lib/server/admin';
import { zodLabelColor, zodSlug } from '$lib/server/zod';

export const load = async () => {};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const parsed = z
			.object({
				slug: zodSlug(),
				name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				color: zodLabelColor(),
				icon: z.string().trim().min(1).max(100)
			})
			.parse(Object.fromEntries(formData));

		if (await collections.labels.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'Label with same slug already exists');
		}

		await collections.labels.insertOne({
			_id: parsed.slug,
			name: parsed.name,
			color: parsed.color,
			icon: parsed.icon,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		throw redirect(303, `${adminPrefix()}/label/${parsed.slug}`);
	}
};
