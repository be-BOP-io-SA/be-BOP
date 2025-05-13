import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { collections } from '$lib/server/database';
import { adminPrefix } from '$lib/server/admin';
import { themeFormStructure } from '$lib/types/Theme';
import { increaseThemeChangeNumber, ThemeData, themeValidator } from '$lib/server/theme';
import { ObjectId } from 'mongodb';
import { get } from '$lib/utils/get';

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
	update: async ({ request, params }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const theme = themeValidator.parse(json) satisfies ThemeData;

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
	},
	duplicateToDark: async ({ request, params }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const jsonToDuplicate: JsonObject = {};
		jsonToDuplicate.name = json.name;
		for (const [section, fields] of Object.entries(themeFormStructure)) {
			for (const field of fields.elements) {
				const key = `${section}.${field.name}`;
				if (key.endsWith('color') || key.endsWith('Color')) {
					const darkPath = `${key}.dark`;
					const lightPath = `${key}.light`;

					const lightValue = get(json, lightPath);

					if (lightValue !== undefined) {
						set(jsonToDuplicate, lightPath, lightValue);
						set(jsonToDuplicate, darkPath, lightValue);
					}
				} else {
					const value = get(json, key);
					if (value !== undefined) {
						set(jsonToDuplicate, key, value);
					}
				}
			}
		}
		const theme = themeValidator.parse(jsonToDuplicate) satisfies ThemeData;

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
	},
	duplicateToLight: async ({ request, params }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const jsonToDuplicate: JsonObject = {};
		jsonToDuplicate.name = json.name;
		for (const [section, fields] of Object.entries(themeFormStructure)) {
			for (const field of fields.elements) {
				const key = `${section}.${field.name}`;
				if (key.endsWith('color') || key.endsWith('Color')) {
					const darkPath = `${key}.dark`;
					const lightPath = `${key}.light`;

					const darkValue = get(json, darkPath);

					if (darkValue !== undefined) {
						set(jsonToDuplicate, lightPath, darkValue);
						set(jsonToDuplicate, darkPath, darkValue);
					}
				} else {
					const value = get(json, key);
					if (value !== undefined) {
						set(jsonToDuplicate, key, value);
					}
				}
			}
		}
		const theme = themeValidator.parse(jsonToDuplicate) satisfies ThemeData;

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
