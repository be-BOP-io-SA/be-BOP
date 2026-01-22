import { collections } from '$lib/server/database';
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

		// Delete all and re-insert
		await collections.tagFamilies.deleteMany({});

		if (validatedFamilies.length > 0) {
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

			await collections.tagFamilies.insertMany(familiesToInsert);

			// Update tags that reference renamed families
			for (const family of validatedFamilies) {
				if (!family._id.startsWith('temp-')) {
					const newSlug = generateId(family.name, false);
					if (newSlug !== family._id) {
						await collections.tags.updateMany(
							{ family: family._id },
							{ $set: { family: newSlug } }
						);
					}
				}
			}
		}

		// Clear family reference for tags whose family was deleted
		const remainingFamilyIds = validatedFamilies.map((f) =>
			f._id.startsWith('temp-') ? generateId(f.name, false) : f._id
		);
		await collections.tags.updateMany(
			{ family: { $nin: [...remainingFamilyIds, '', null, undefined] } },
			{ $unset: { family: '' } }
		);

		return { success: true };
	}
};
