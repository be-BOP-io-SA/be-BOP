import { collections } from '$lib/server/database';
import { locales, type LanguageKey } from '$lib/translations';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

export const load = async ({ params }) => {
	const optin = await collections.consentOptins.findOne({
		_id: params.id,
		deletedAt: { $exists: false }
	});
	if (!optin) {
		throw error(404, 'Opt-in not found');
	}
	return {
		optin: { _id: optin._id, label: optin.label, translations: optin.translations ?? {} }
	};
};

export const actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const { language, label } = z
			.object({
				language: z.enum(locales as [LanguageKey, ...LanguageKey[]]),
				label: z.string().trim()
			})
			.parse({ language: formData.get('language'), label: formData.get('label') ?? '' });

		const result = await collections.consentOptins.updateOne(
			{ _id: params.id, deletedAt: { $exists: false } },
			label
				? { $set: { [`translations.${language}.label`]: label, updatedAt: new Date() } }
				: { $unset: { [`translations.${language}`]: '' }, $set: { updatedAt: new Date() } }
		);
		if (result.matchedCount === 0) {
			throw error(404, 'Opt-in not found');
		}
	}
};
