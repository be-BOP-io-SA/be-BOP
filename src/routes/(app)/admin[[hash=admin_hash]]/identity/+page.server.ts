import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country.js';
import type { SellerIdentity } from '$lib/types/SellerIdentity.js';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error } from '@sveltejs/kit';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export function load({ locals }) {
	// Until https://github.com/be-BOP-io-SA/be-BOP/issues/220
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page !');
	}

	return {
		sellerIdentity: runtimeConfig.sellerIdentity
	};
}

export const actions = {
	default: async ({ request, locals }) => {
		// Until https://github.com/be-BOP-io-SA/be-BOP/issues/220
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Forbidden. Only Super Admin can access this page !');
		}

		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			if (value) {
				set(json, key, value);
			}
		}

		const identity: SellerIdentity = z
			.object({
				businessName: z.string().min(1).max(100).trim(),
				vatNumber: z.string().min(1).max(100).trim().optional(),
				address: z.object({
					street: z.string().min(1).max(100).trim(),
					zip: z.string().min(1).max(100).trim(),
					city: z.string().min(1).max(100).trim(),
					country: z.enum([...COUNTRY_ALPHA2S] as [CountryAlpha2, ...CountryAlpha2[]]),
					state: z.string().min(1).max(100).trim().optional()
				}),
				contact: z.object({
					email: z.string().min(1).max(100).trim(),
					phone: z.string().min(1).max(100).trim().optional()
				}),
				bank: z
					.object({
						iban: z.string().min(1).max(100).trim(),
						bic: z.string().min(1).max(100).trim(),
						accountHolder: z.string().min(1).max(100).trim().optional(),
						accountHolderAddress: z.string().min(1).max(500).trim().optional()
					})
					.optional(),
				invoice: z
					.object({
						issuerInfo: z.string().min(1).max(500).trim().optional()
					})
					.optional()
			})
			.parse(json);

		await collections.runtimeConfig.updateOne(
			{
				_id: 'sellerIdentity'
			},
			{
				$set: {
					data: identity,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.sellerIdentity = identity;
	}
};
