import { collections } from '$lib/server/database.js';
import { redirect } from '@sveltejs/kit';
import {
	acceptedConsentOptinIds,
	displayedConsentOptins,
	saveSignedInConsent,
	signedInConsentAddress
} from '$lib/server/consentOptins';
import { userIdentifier, userQuery } from '$lib/server/user';
import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country.js';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

/**
 * The page is reserved to a session signed in with an e-mail or an npub: that address is proven
 * by the sign-in link, so the opt-ins saved here belong to whoever controls it. A blank session
 * or an employee sign-in alone is sent to the login page.
 */
function requireContactSignIn(locals: App.Locals) {
	if (!locals.email && !locals.npub) {
		throw redirect(303, '/login');
	}
}

export async function load({ locals }) {
	requireContactSignIn(locals);
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
			consentOptinIds: await acceptedConsentOptinIds(signedInConsentAddress(locals)),
			npub: personalInfoConnected?.npub,
			email: personalInfoConnected?.email
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

		const consentAddress = signedInConsentAddress(locals);
		const displayedIds = (await displayedConsentOptins(locals.language)).map(({ id }) => id);
		if (consentAddress && displayedIds.length) {
			await saveSignedInConsent({
				address: consentAddress,
				displayedIds,
				acceptedIds: formData.getAll('consentOptinIds').map(String)
			});
		}
	}
};
