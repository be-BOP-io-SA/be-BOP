import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error, redirect } from '@sveltejs/kit';
import { adminPrefix } from '$lib/server/admin';
import { z } from 'zod';

export const actions = {
	update: async ({ request, params }) => {
		const formData = await request.formData();
		const slug = params.id;

		const parsed = z
			.object({
				clientId: z.string().min(1).trim(),
				clientSecret: z.string().min(1).trim(),
				issuer: z.string().url().trim(),
				scope: z.string().min(1).trim(),
				name: z.string().min(1).trim(),
				enabled: z.boolean({ coerce: true }).optional()
			})
			.parse(Object.fromEntries(formData));

		console.log('parsed', parsed, Object.fromEntries(formData));

		const oauth = runtimeConfig.oauth.find((o) => o.slug === slug);

		if (!oauth) {
			throw error(404, 'OAuth provider not found: ' + slug);
		}

		runtimeConfig.oauth = runtimeConfig.oauth.map((o) => {
			if (o.slug === slug) {
				return {
					...o,
					clientId: parsed.clientId,
					clientSecret: parsed.clientSecret,
					issuer: parsed.issuer,
					scope: parsed.scope,
					slug: slug,
					name: parsed.name,
					enabled: parsed.enabled ?? false
				};
			}
			return o;
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
			}
		);
	},
	delete: async ({ params }) => {
		const slug = params.id;

		runtimeConfig.oauth = runtimeConfig.oauth.filter((o) => o.slug !== slug);

		await collections.runtimeConfig.updateOne(
			{
				_id: 'oauth'
			},
			{
				$set: {
					updatedAt: new Date(),
					data: runtimeConfig.oauth
				}
			}
		);

		throw redirect(303, `${adminPrefix()}/oauth`);
	}
};
