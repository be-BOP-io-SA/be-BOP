import { collections } from '$lib/server/database.js';
import { validateEmailOrNpub } from '$lib/server/nostr';
import { availableContactModes } from '$lib/server/contact-modes';
import { contactModesOrEmail } from '$lib/types/ContactMode';
import { error } from '@sveltejs/kit';
import { displayedConsentOptins, saveConsentOptinAnswers } from '$lib/server/consentOptins';
import { userIdentifier, userQuery } from '$lib/server/user';
import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country.js';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export async function load({ locals }) {
	const personalInfoConnected = await collections.personalInfo.findOne(
		userQuery(userIdentifier(locals)),
		{
			sort: { _id: -1 }
		}
	);
	return {
		consentOptins: await displayedConsentOptins(locals.language),
		personalInfoConnected: {
			firstName: personalInfoConnected?.firstName,
			lastName: personalInfoConnected?.lastName,
			address: personalInfoConnected?.address,
			_id: personalInfoConnected?._id.toString(),
			consentOptinIds: personalInfoConnected?.consentOptinIds ?? [],
			npub: personalInfoConnected?.npub,
			email: personalInfoConnected?.email
		}
	};
}

export const actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			if (value) {
				set(json, key, value);
			}
		}

		// The page saves what the form holds: a field left empty is removed. Name and postal address
		// are optional and may be partial, so that a customer known only by an e-mail or an npub can
		// manage their opt-ins; the contact address is required.
		const optionalText = z.string().min(1).max(100).trim().optional();
		const personalInfo = z
			.object({
				address: z
					.object({
						street: optionalText,
						zip: optionalText,
						city: optionalText,
						state: optionalText,
						country: z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]]).optional()
					})
					.optional(),
				firstName: optionalText,
				lastName: optionalText
			})
			.parse(json);

		const contact = validateEmailOrNpub(
			String(formData.get('contactAddress') ?? '').trim(),
			contactModesOrEmail(availableContactModes())
		);
		if ('error' in contact) {
			throw error(400, 'Invalid contact address');
		}

		const address =
			personalInfo.address && Object.keys(personalInfo.address).length
				? personalInfo.address
				: undefined;

		await collections.personalInfo.updateOne(
			userQuery(userIdentifier(locals)),
			{
				$set: {
					...(address && { address }),
					...(personalInfo.firstName && { firstName: personalInfo.firstName }),
					...(personalInfo.lastName && { lastName: personalInfo.lastName }),
					[contact.kind]: contact.address,
					updatedAt: new Date(),
					user: userIdentifier(locals)
				},
				$unset: {
					...(!address && { address: '' }),
					...(!personalInfo.firstName && { firstName: '' }),
					...(!personalInfo.lastName && { lastName: '' }),
					[contact.kind === 'email' ? 'npub' : 'email']: ''
				},
				$setOnInsert: { createdAt: new Date() }
			},
			{
				upsert: true
			}
		);

		const acceptedConsentOptinIds = formData.getAll('consentOptinIds').map(String);
		if (acceptedConsentOptinIds.length) {
			const displayedIds = (await displayedConsentOptins(locals.language)).map(({ id }) => id);
			if (acceptedConsentOptinIds.some((id) => displayedIds.includes(id))) {
				await saveConsentOptinAnswers({
					user: userIdentifier(locals),
					displayedIds,
					acceptedIds: acceptedConsentOptinIds
				});
			}
		}
	}
};
