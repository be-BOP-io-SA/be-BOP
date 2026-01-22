import { collections } from '$lib/server/database';
import { z } from 'zod';
import { fail } from '@sveltejs/kit';
import { generateId } from '$lib/utils/generateId';

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

export const actions = {
	createFamily: async ({ request }) => {
		const formData = await request.formData();

		const parsed = z
			.object({
				name: z.string().min(1).max(100)
			})
			.safeParse({
				name: formData.get('name')
			});

		if (!parsed.success) {
			return fail(400, { error: 'Invalid family name' });
		}

		const slug = generateId(parsed.data.name, false);

		const existing = await collections.tagFamilies.findOne({ _id: slug });
		if (existing) {
			return fail(400, { error: 'A family with this name already exists' });
		}

		const maxOrder = await collections.tagFamilies
			.find({})
			.sort({ order: -1 })
			.limit(1)
			.toArray();

		await collections.tagFamilies.insertOne({
			_id: slug,
			name: parsed.data.name.trim(),
			order: (maxOrder[0]?.order ?? 0) + 1,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return { success: true };
	},

	deleteFamily: async ({ request }) => {
		const formData = await request.formData();
		const id = String(formData.get('id'));
		const force = formData.get('force') === 'true';

		if (!id) {
			return fail(400, { error: 'Family ID is required' });
		}

		const tagsCount = await collections.tags.countDocuments({ family: id });

		if (tagsCount > 0 && !force) {
			return fail(400, {
				error: `This family has ${tagsCount} tag(s). Use force delete to dissociate them.`,
				requiresForce: true,
				familyId: id,
				tagsCount
			});
		}

		if (tagsCount > 0 && force) {
			await collections.tags.updateMany({ family: id }, { $unset: { family: '' } });
		}

		await collections.tagFamilies.deleteOne({ _id: id });

		return { success: true };
	}
};
