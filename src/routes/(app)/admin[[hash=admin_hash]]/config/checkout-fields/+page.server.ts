import type { Actions, PageServerLoad } from './$types';
import { collections } from '$lib/server/database';
import { fail } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import {
	CHECKOUT_FIELD_TYPES,
	FREE_INPUT_FORMATS,
	type CheckoutFieldConfig
} from '$lib/types/CheckoutFieldConfig';

const fieldSchema = z.object({
	slug: z
		.string()
		.min(1)
		.regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
	name: z.string().min(1),
	label: z.string().min(1),
	type: z.enum(CHECKOUT_FIELD_TYPES),
	maxLength: z.coerce.number().int().positive().optional(),
	format: z.enum(FREE_INPUT_FORMATS).optional(),
	required: z.boolean({ coerce: true }).default(false),
	disabled: z.boolean({ coerce: true }).default(false),
	isPersonalData: z.boolean({ coerce: true }).default(false)
});

function parseForm(formData: FormData) {
	const parsed = fieldSchema.safeParse({
		slug: formData.get('slug'),
		name: formData.get('name'),
		label: formData.get('label'),
		type: formData.get('type'),
		maxLength: formData.get('maxLength') || undefined,
		format: formData.get('format') || undefined,
		required: formData.get('required') === 'true',
		disabled: formData.get('disabled') === 'true',
		isPersonalData: formData.get('isPersonalData') === 'true'
	});

	if (!parsed.success) {
		return { error: parsed.error.message } as const;
	}

	const options =
		parsed.data.type === 'options'
			? String(formData.get('options') ?? '')
					.split(/\r?\n/)
					.map((line) => line.trim())
					.filter(Boolean)
			: undefined;

	if (parsed.data.type === 'options' && !options?.length) {
		return { error: 'Options list cannot be empty' } as const;
	}

	return { data: parsed.data, options } as const;
}

function fieldDocFields(parsed: z.infer<typeof fieldSchema>, options: string[] | undefined) {
	const free =
		parsed.type === 'free' && (parsed.maxLength !== undefined || parsed.format !== undefined)
			? {
					...(parsed.maxLength !== undefined && { maxLength: parsed.maxLength }),
					...(parsed.format !== undefined && { format: parsed.format })
			  }
			: undefined;

	return {
		name: parsed.name,
		label: parsed.label,
		type: parsed.type,
		...(options && { options }),
		...(free && { free }),
		required: parsed.required,
		disabled: parsed.disabled,
		isPersonalData: parsed.isPersonalData
	};
}

export const load: PageServerLoad = async () => {
	const fieldsRaw = await collections.checkoutFieldConfigs
		.find({})
		.sort({ sortOrder: 1 })
		.toArray();

	const fields = fieldsRaw.map((field) => ({
		...field,
		_id: field._id.toString(),
		createdAt: field.createdAt.toISOString(),
		updatedAt: field.updatedAt.toISOString()
	}));

	return { fields, fieldTypes: CHECKOUT_FIELD_TYPES, freeFormats: FREE_INPUT_FORMATS };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const result = parseForm(formData);
		if ('error' in result) {
			return fail(400, { error: result.error });
		}

		const existing = await collections.checkoutFieldConfigs.findOne({ slug: result.data.slug });
		if (existing) {
			return fail(400, { error: 'Field with this slug already exists' });
		}

		const [maxSortOrder] = await collections.checkoutFieldConfigs
			.find({})
			.sort({ sortOrder: -1 })
			.limit(1)
			.toArray();

		const newField: CheckoutFieldConfig = {
			_id: new ObjectId(),
			slug: result.data.slug,
			...fieldDocFields(result.data, result.options),
			sortOrder: (maxSortOrder?.sortOrder ?? 0) + 1,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		await collections.checkoutFieldConfigs.insertOne(newField);

		return { success: true };
	},

	update: async ({ request }) => {
		const formData = await request.formData();
		const idParsed = z.object({ id: z.string().min(1) }).safeParse({ id: formData.get('id') });
		if (!idParsed.success || !ObjectId.isValid(idParsed.data.id)) {
			return fail(400, { error: 'Invalid ID' });
		}

		const result = parseForm(formData);
		if ('error' in result) {
			return fail(400, { error: result.error });
		}

		const updateResult = await collections.checkoutFieldConfigs.updateOne(
			{ _id: new ObjectId(idParsed.data.id) },
			{
				$set: {
					...fieldDocFields(result.data, result.options),
					updatedAt: new Date()
				},
				$unset: {
					...(result.data.type !== 'options' && { options: '' }),
					...(result.data.type !== 'free' && { free: '' })
				}
			}
		);

		if (updateResult.matchedCount === 0) {
			return fail(404, { error: 'Field not found' });
		}

		return { success: true };
	},

	saveSortOrder: async ({ request }) => {
		const formData = await request.formData();
		const idsParsed = z
			.array(z.string().min(1))
			.min(1)
			.safeParse(formData.getAll('ids').map(String));
		if (!idsParsed.success) {
			return fail(400, { error: 'Invalid order' });
		}
		const validIds = idsParsed.data.filter((id) => ObjectId.isValid(id));
		if (!validIds.length) {
			return fail(400, { error: 'Invalid order' });
		}

		await collections.checkoutFieldConfigs.bulkWrite(
			validIds.map((id, index) => ({
				updateOne: {
					filter: { _id: new ObjectId(id) },
					update: { $set: { sortOrder: index, updatedAt: new Date() } }
				}
			}))
		);

		return { success: true };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = String(formData.get('id'));
		if (!ObjectId.isValid(id)) {
			return fail(400, { error: 'Invalid ID' });
		}

		const field = await collections.checkoutFieldConfigs.findOne({ _id: new ObjectId(id) });
		if (!field) {
			return fail(404, { error: 'Field not found' });
		}

		await collections.checkoutFieldConfigs.deleteOne({ _id: new ObjectId(id) });

		return { success: true };
	}
};
