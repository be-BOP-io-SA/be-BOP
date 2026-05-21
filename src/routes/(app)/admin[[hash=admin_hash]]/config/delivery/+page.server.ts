import { runtimeConfig } from '$lib/server/runtime-config';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { defaultBlacklistSchema, deliveryFeesSchema, deliveryZonesSchema } from './schema';
import { zodObjectId } from '$lib/server/zod';

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const parsed = z
			.object({
				mode: z.enum(['flatFee', 'perItem']),
				onlyPayHighest: z.boolean({ coerce: true }),
				applyFlatFeeToEachItem: z.boolean({ coerce: true }),
				deliveryFees: deliveryFeesSchema.default({}),
				deliveryZones: deliveryZonesSchema.default([]),
				defaultBlacklist: defaultBlacklistSchema.default([]),
				allowFreeForPOS: z.boolean({ coerce: true }),
				vatIncludedReference: z.boolean({ coerce: true }).default(false),
				vatProfileId: zodObjectId()
					.or(z.literal(''))
					.optional()
					.transform((s) => s || null)
			})
			.safeParse(json);

		// Return a friendly error instead of throwing a 422 page that wipes the admin's edits.
		if (!parsed.success) {
			const hasZoneIssue = parsed.error.issues.some((issue) => issue.path[0] === 'deliveryZones');
			return fail(422, {
				error: hasZoneIssue
					? 'Each delivery zone needs a name and at least one country. Complete or remove empty zones before saving.'
					: `Could not save delivery settings: ${
							parsed.error.issues[0]?.message ?? 'invalid input'
					  }`
			});
		}

		const deliveryFees = parsed.data;

		await collections.runtimeConfig.updateOne(
			{
				_id: 'deliveryFees'
			},
			{
				$set: {
					data: deliveryFees,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.deliveryFees = deliveryFees;

		return {
			success: true
		};
	}
};
