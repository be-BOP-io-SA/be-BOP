import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { redirect } from '@sveltejs/kit';
import { error } from 'console';
import { z } from 'zod';

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const parsed = z
			.object({
				clientId: z.string().min(1).trim(),
				clientSecret: z.string().min(1).trim(),
				issuer: z.string().url().trim(),
				scope: z.string().min(1).trim(),
				slug: z.string().min(1).trim(),
				name: z.string().min(1).trim(),
				enabled: z.boolean({ coerce: true }).optional()
			})
			.parse(Object.fromEntries(formData));

		if (runtimeConfig.oauth.some((o) => o.slug === parsed.slug)) {
			throw error(400, 'Slug already exists');
		}

		runtimeConfig.oauth.push({
			clientId: parsed.clientId,
			clientSecret: parsed.clientSecret,
			issuer: parsed.issuer,
			scope: parsed.scope,
			slug: parsed.slug,
			name: parsed.name,
			enabled: parsed.enabled ?? false
		});

		await collections.runtimeConfig.updateOne(
			{
				_id: 'oauth'
			},
			{
				$set: {
					updatedAt: new Date(),
					data: runtimeConfig.oauth
				}
			},
			{
				upsert: true
			}
		);

		throw redirect(303, `${adminPrefix()}/oauth/${parsed.slug}`);
	}
};
