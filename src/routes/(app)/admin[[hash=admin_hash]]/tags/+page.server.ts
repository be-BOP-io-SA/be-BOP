import { collections, withTransaction } from '$lib/server/database';
import { z } from 'zod';
import { generateId } from '$lib/utils/generateId';
import type { Actions } from './$types';

interface RawTagFamily {
	_id: string;
	name: string;
	createdAt?: string | Date;
	updatedAt?: string | Date;
}

export const load = async () => {
	const [tags, families] = await Promise.all([
		collections.tags.find({}).toArray(),
		collections.tagFamilies.find({}).sort({ order: 1 }).toArray()
	]);

	return {
		tags,
		families
	};
};

export const actions: Actions = {
	saveFamilies: async ({ request }) => {
		const formData = await request.formData();
		const familiesString = formData.get('families');

		const familiesParsed: RawTagFamily[] = familiesString
			? JSON.parse(String(familiesString))
					.filter((family: { name: string }) => family.name.trim() !== '')
					.map((family: RawTagFamily, index: number) => ({ ...family, order: index }))
			: [];

		// Validate each family
		const familySchema = z.object({
			_id: z.string(),
			name: z.string().min(1).max(100),
			order: z.number(),
			createdAt: z.union([z.string(), z.date()]).optional(),
			updatedAt: z.union([z.string(), z.date()]).optional()
		});

		const validatedFamilies = familiesParsed.map((f) => familySchema.parse(f));

		// Get current families to preserve timestamps
		const existingFamilies = await collections.tagFamilies.find({}).toArray();
		const existingMap = new Map(existingFamilies.map((f) => [f._id, f]));

		// Compute slugs once for reuse in insert and orphan cleanup
		const familiesToInsert = validatedFamilies.map((family) => {
			const isNew = family._id.startsWith('temp-');
			const slug = isNew ? generateId(family.name, false) : family._id;
			const existing = existingMap.get(family._id);

			return {
				_id: slug,
				name: family.name.trim(),
				order: family.order,
				createdAt: isNew ? new Date() : existing?.createdAt ?? new Date(),
				updatedAt: new Date()
			};
		});

		const remainingFamilyIds = familiesToInsert.map((f) => f._id);

		await withTransaction(async (session) => {
			await collections.tagFamilies.deleteMany({}, { session });

			if (familiesToInsert.length > 0) {
				await collections.tagFamilies.insertMany(familiesToInsert, { session });
			}

			// Clear family reference for tags whose family was deleted
			await collections.tags.updateMany(
				{ family: { $exists: true, $ne: '', $nin: remainingFamilyIds } },
				{ $unset: { family: '' } },
				{ session }
			);
		});

		return { success: true };
	}
};
