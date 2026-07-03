import { runtimeConfig } from '$lib/server/runtime-config';
import { collections } from '$lib/server/database';
import { set } from '$lib/utils/set';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';

export function load() {
	return {
		customPaymentMethods: runtimeConfig.customPaymentMethods
	};
}

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const parsed = z
			.object({
				customPaymentMethods: z
					.array(
						z.object({
							id: z.string().trim().optional(),
							label: z.string().trim(),
							instructions: z.string()
						})
					)
					.default([])
			})
			.parse(json);

		// Discard fully-empty rows (added then left blank), but reject a row that has instructions with
		// no label rather than silently dropping the admin's work.
		const rows = parsed.customPaymentMethods.filter(
			(method) => method.label.length > 0 || method.instructions.length > 0
		);
		if (rows.some((method) => method.label.length === 0)) {
			return fail(400, { error: 'labelRequired' });
		}
		// Keep stable ids; mint one for new rows so existing orders that reference a method resolve.
		const customPaymentMethods = rows.map((method) => ({
			id: method.id || crypto.randomUUID(),
			label: method.label,
			instructions: method.instructions
		}));

		await collections.runtimeConfig.updateOne(
			{ _id: 'customPaymentMethods' },
			{
				$set: { data: customPaymentMethods, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
		runtimeConfig.customPaymentMethods = customPaymentMethods;

		return { success: true };
	}
};
