import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { set } from '$lib/utils/set';
import { collections } from '$lib/server/database';
import { adminPrefix } from '$lib/server/admin';
import type { Theme } from '$lib/types/Theme';
import type { Timestamps } from '$lib/types/Timestamps';
import { themeValidator } from '$lib/server/theme';
import { ObjectId } from 'mongodb';

export async function load() {}

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const json = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const theme = themeValidator.parse(json) satisfies Omit<Theme, '_id' | keyof Timestamps>;

		const { insertedId } = await collections.themes.insertOne({
			_id: new ObjectId(),
			...theme,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		throw redirect(303, `${adminPrefix()}/theme/${insertedId}`);
	}
};
