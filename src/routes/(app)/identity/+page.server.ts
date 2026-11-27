import { collections } from '$lib/server/database.js';
import { redirect } from '@sveltejs/kit';
import {
	acceptedConsentOptinIds,
	displayedConsentOptins,
	recordConsentChoice,
	signedInConsentAddress
} from '$lib/server/consentOptins';
import { userIdentifier, userQuery } from '$lib/server/user';
import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country.js';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

/**
 * The page is reserved to a session whose address is proven: by an e-mail or a Nostr sign-in
 * link, or by a provider that attests the e-mail (Google, Facebook…). The opt-ins saved here
 * belong to whoever controls that address. A blank session or an employee sign-in alone is sent
 * to the login page.
 */
function requireContactSignIn(locals: App.Locals) {
	const address = signedInConsentAddress(locals);
	if (!address) {
		throw redirect(303, '/login');
	}
	return address;
}

export async function load({ locals }) {
	const signedInAddress = requireContactSignIn(locals);
	const personalInfoConnected = await collections.personalInfo.findOne(
		userQuery(userIdentifier(locals)),
		{
			sort: { _id: -1 }
		}
	);
	return {
		signedInAddress,
		consentOptins: await displayedConsentOptins(locals.language),
		personalInfoConnected: {
			firstName: personalInfoConnected?.firstName,
			lastName: personalInfoConnected?.lastName,
			address: personalInfoConnected?.address,
			_id: personalInfoConnected?._id.toString(),
			consentOptinIds: await acceptedConsentOptinIds(signedInConsentAddress(locals))
		}
	};
}

export const actions = {
	default: async ({ request, locals }) => {
		requireContactSignIn(locals);
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			if (value) {
				set(json, key, value);
			}
		}

		// The page saves what the form holds: a field left empty is removed. Name and postal address
		// are optional and may be partial; the contact address is the one the session signed in with.
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

		const address =
			personalInfo.address && Object.keys(personalInfo.address).length
				? personalInfo.address
				: undefined;

		const removed = [
			...(address ? [] : ['address']),
			...(personalInfo.firstName ? [] : ['firstName']),
			...(personalInfo.lastName ? [] : ['lastName'])
		];
		const now = new Date();

		await collections.personalInfo.updateOne(
			userQuery(userIdentifier(locals)),
			[
				{
					$set: {
						...(address && { address: { $literal: address } }),
						...(personalInfo.firstName && { firstName: { $literal: personalInfo.firstName } }),
						...(personalInfo.lastName && { lastName: { $literal: personalInfo.lastName } }),
						...(locals.email && { email: { $literal: locals.email } }),
						...(locals.npub && { npub: { $literal: locals.npub } }),
						user: { $literal: userIdentifier(locals) },
						updatedAt: now,
						createdAt: { $ifNull: ['$createdAt', now] }
					}
				},
				...(removed.length ? [{ $unset: removed }] : [])
			],
			{
				upsert: true
			}
		);

		await recordConsentChoice({ locals, formData });
	}
};
