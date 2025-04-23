import { collections } from '$lib/server/database.js';
import { zodNpub } from '$lib/server/nostr';
import { runtimeConfig } from '$lib/server/runtime-config';
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
		displayNewsletterCommercialProspection: runtimeConfig.displayNewsletterCommercialProspection,
		personalInfoConnected: {
			firstName: personalInfoConnected?.firstName,
			lastName: personalInfoConnected?.lastName,
			address: personalInfoConnected?.address,
			_id: personalInfoConnected?._id.toString(),
			newsletter: personalInfoConnected?.newsletter,
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

		const personalInfo = z
			.object({
				address: z.object({
					street: z.string().min(1).max(100).trim(),
					zip: z.string().min(1).max(100).trim(),
					city: z.string().min(1).max(100).trim(),
					country: z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]]),
					state: z.string().min(1).max(100).trim().optional()
				}),
				firstName: z.string().min(1).max(100).trim(),
				lastName: z.string().min(1).max(100).trim(),
				newsletter: z
					.object({
						seller: z.boolean({ coerce: true }).default(false),
						partner: z.boolean({ coerce: true }).default(false)
					})
					.optional(),
				npub: zodNpub().optional(),
				email: z.string().email().optional()
			})
			.parse(json);

		await collections.personalInfo.updateOne(
			userQuery(userIdentifier(locals)),
			{
				$set: {
					address: personalInfo.address,
					firstName: personalInfo.firstName,
					lastName: personalInfo.lastName,
					...(personalInfo.newsletter && { newsletter: personalInfo.newsletter }),
					...(personalInfo.npub && { npub: personalInfo.npub }),
					...(personalInfo.email && { email: personalInfo.email }),
					updatedAt: new Date(),
					user: userIdentifier(locals)
				},
				$setOnInsert: { createdAt: new Date() }
			},
			{
				upsert: true
			}
		);
	}
};
