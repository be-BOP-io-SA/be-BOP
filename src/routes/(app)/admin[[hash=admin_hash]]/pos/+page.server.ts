import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Tag } from '$lib/types/Tag';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const load = async ({}) => {
	const tags = await collections.tags
		.find({})
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();

	return {
		tags: tags.filter((tag) => tag._id !== 'pos-favorite'),
		posTouchTag: runtimeConfig.posTouchTag,
		posPrefillTermOfUse: runtimeConfig.posPrefillTermOfUse
	};
};
export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();
		const posTouchTagString = formData.get('posTouchTag');
		if (!posTouchTagString) {
			throw error(400, 'No posTouchTag provided');
		}
		const posTouchTag = JSON.parse(String(posTouchTagString));
		const result = z
			.object({
				posTouchTag: z.string().array(),
				posPrefillTermOfUse: z.boolean({ coerce: true })
			})
			.parse({
				posTouchTag,
				posPrefillTermOfUse: formData.get('posPrefillTermOfUse')
			});
		await collections.runtimeConfig.updateOne(
			{
				_id: 'posTouchTag'
			},
			{
				$set: {
					data: result.posTouchTag,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		await collections.runtimeConfig.updateOne(
			{
				_id: 'posPrefillTermOfUse'
			},
			{
				$set: {
					data: result.posPrefillTermOfUse,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		throw redirect(303, `${adminPrefix()}/pos`);
	}
};
