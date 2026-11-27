import { collections } from '$lib/server/database';
import { newConsentOptinVersions } from '$lib/server/consentOptins';
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
	default: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const { language, label } = z
			.object({
				language: z.enum(locales as [LanguageKey, ...LanguageKey[]]),
				label: z.string().trim()
			})
			.parse({ language: formData.get('language'), label: formData.get('label') ?? '' });

		const optin = await collections.consentOptins.findOne({
			_id: params.id,
			deletedAt: { $exists: false }
		});
		if (!optin) {
			throw error(404, 'Opt-in not found');
		}
		if ((optin.translations?.[language]?.label ?? '') === label) {
			return;
		}
		const translations = { ...optin.translations };
		if (label) {
			translations[language] = { label };
		} else {
			delete translations[language];
		}
		// Each translation saved is a new wording, kept next to the previous ones for audits.
		await collections.consentOptins.updateOne(
			{ _id: params.id },
			{
				$set: { translations, updatedAt: new Date() },
				$push: {
					versions: {
						$each: newConsentOptinVersions(optin, { label: optin.label, translations }, locals)
					}
				}
			}
		);
	}
};
