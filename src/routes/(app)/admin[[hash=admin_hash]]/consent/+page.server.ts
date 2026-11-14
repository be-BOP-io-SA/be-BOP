import type { Actions } from './$types';
import { collections } from '$lib/server/database';
import { fail } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const optinSchema = z.object({
	label: z.string().trim().min(1),
	enabled: z.boolean()
});

function parseForm(formData: FormData) {
	return optinSchema.safeParse({
		label: formData.get('label'),
		enabled: formData.get('enabled') === 'true'
	});
}

export const load = async () => {
	const optins = await collections.consentOptins
		.find({ deletedAt: { $exists: false } })
		.sort({ sortOrder: 1 })
		.toArray();

	return {
		optins: optins.map((optin) => ({
			_id: optin._id,
			label: optin.label,
			enabled: optin.enabled
		}))
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const parsed = parseForm(await request.formData());
		if (!parsed.success) {
			return fail(400, { error: parsed.error.message });
		}

		const [last] = await collections.consentOptins
			.find({})
			.sort({ sortOrder: -1 })
			.limit(1)
			.toArray();

		await collections.consentOptins.insertOne({
			_id: new ObjectId().toString(),
			label: parsed.data.label,
			enabled: parsed.data.enabled,
			sortOrder: (last?.sortOrder ?? -1) + 1,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return { success: true };
	},

	update: async ({ request }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		const parsed = parseForm(formData);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.message });
		}

		const result = await collections.consentOptins.updateOne(
			{ _id: id, deletedAt: { $exists: false } },
			{ $set: { label: parsed.data.label, enabled: parsed.data.enabled, updatedAt: new Date() } }
		);
		if (result.matchedCount === 0) {
			return fail(404, { error: 'Opt-in not found' });
		}

		return { success: true };
	},

	saveSortOrder: async ({ request }) => {
		const formData = await request.formData();
		const ids = formData.getAll('ids').map(String).filter(Boolean);
		if (!ids.length) {
			return fail(400, { error: 'Invalid order' });
		}

		await collections.consentOptins.bulkWrite(
			ids.map((id, index) => ({
				updateOne: {
					filter: { _id: id },
					update: { $set: { sortOrder: index, updatedAt: new Date() } }
				}
			}))
		);

		return { success: true };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');

		// Kept in the collection: customers who accepted it stay listed in the consent export.
		const result = await collections.consentOptins.updateOne(
			{ _id: id, deletedAt: { $exists: false } },
			{ $set: { deletedAt: new Date(), updatedAt: new Date() } }
		);
		if (result.matchedCount === 0) {
			return fail(404, { error: 'Opt-in not found' });
		}

		return { success: true };
	}
};
