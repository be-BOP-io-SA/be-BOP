import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { adminPrefix } from '$lib/server/admin';
import type { Theme } from '$lib/types/Theme';
import type { Timestamps } from '$lib/types/Timestamps';
import { themeValidator } from '$lib/server/theme';
import { generateThemeData } from '$lib/server/theme-assist';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { systemFonts } from '$lib/types/Theme';

const assistFormValidator = z.object({
	name: z.string().min(1),
	primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
	secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
	mainFont: z.enum([systemFonts[0], ...systemFonts.slice(1)]),
	secondaryFont: z.enum(['', systemFonts[0], ...systemFonts.slice(1)])
});

export async function load() {}

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const parsed = assistFormValidator.parse(Object.fromEntries(formData));

		const themeData = generateThemeData({
			name: parsed.name,
			primaryColor: parsed.primaryColor,
			secondaryColor: parsed.secondaryColor,
			mainFont: parsed.mainFont,
			secondaryFont: parsed.secondaryFont || undefined
		});

		const validated = themeValidator.parse(themeData) satisfies Omit<
			Theme,
			'_id' | keyof Timestamps
		>;

		const insertedId = new ObjectId();
		await collections.themes.insertOne({
			_id: insertedId,
			...validated,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		throw redirect(303, `${adminPrefix()}/theme/${insertedId}`);
	}
};
