import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import { specificationTranslatableSchema } from './specification-schema';
import type { Actions } from './$types';

export const actions: Actions = {
	update: async function ({ request, params }) {
		const specification = await collections.specifications.findOne({
			_id: params.id
		});

		if (!specification) {
			throw error(404, 'Specification not found');
		}

		const data = await request.formData();

		const parsed = z
			.object({
				...specificationTranslatableSchema
			})
			.parse(Object.fromEntries(data));

		await collections.specifications.updateOne(
			{
				_id: specification._id
			},
			{
				$set: {
					title: parsed.title,
					content: parsed.content,
					updatedAt: new Date()
				}
			}
		);
	},

	delete: async function ({ params }) {
		await collections.specifications.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/specification`);
	}
};
