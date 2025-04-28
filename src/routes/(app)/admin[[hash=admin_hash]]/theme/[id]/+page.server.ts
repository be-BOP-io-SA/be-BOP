import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { collections } from '$lib/server/database';
import { adminPrefix } from '$lib/server/admin';
import type { Theme } from '$lib/types/Theme';
import type { Timestamps } from '$lib/types/Timestamps';
import { increaseThemeChangeNumber, themeValidator } from '$lib/server/theme';
import { ObjectId } from 'mongodb';

export async function load({ params }) {
	const theme = await collections.themes.findOne({ _id: new ObjectId(params.id) });

	if (!theme) {
		throw redirect(303, `${adminPrefix()}/theme`);
	}

	return {
		theme: {
			...theme,
			_id: theme._id.toString()
		}
	};
}

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const theme = themeValidator.parse(json) satisfies Omit<Theme, '_id' | keyof Timestamps>;

		await collections.themes.updateOne(
			{ _id: new ObjectId(params.id) },
			{
				$set: {
					...theme,
					updatedAt: new Date()
				}
			}
		);

		await increaseThemeChangeNumber();
	}
};
