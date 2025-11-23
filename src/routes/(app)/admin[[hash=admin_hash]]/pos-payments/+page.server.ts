import type { Actions } from './$types';
import { collections } from '$lib/server/database';
import { fail } from '@sveltejs/kit';
import { isStripeEnabled } from '$lib/server/stripe';
import { isSumupEnabled } from '$lib/server/sumup';
import { ObjectId } from 'mongodb';
import type { PosPaymentSubtype } from '$lib/types/PosPaymentSubtype';
import { ALL_PAYMENT_PROCESSORS, type PaymentProcessor } from '$lib/server/payment-methods';
import { z } from 'zod';
import { typedInclude } from '$lib/utils/typedIncludes';

function asPaymentProcessor(value: string): PaymentProcessor | undefined {
	return typedInclude(ALL_PAYMENT_PROCESSORS, value) ? value : undefined;
}

const tapToPayProcessorEnum = z.enum(['', ...ALL_PAYMENT_PROCESSORS]);

const cashSubtypeUpdateSchema = z.object({
	paymentDetailRequired: z.boolean().optional()
});

const regularSubtypeUpdateSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	tapToPayProcessor: tapToPayProcessorEnum,
	tapToPayUrl: z.string().trim().optional(),
	disabled: z.boolean().optional(),
	paymentDetailRequired: z.boolean().optional()
});

export const load = async () => {
	const subtypesRaw = await collections.posPaymentSubtypes
		.find({})
		.sort({ sortOrder: 1 })
		.toArray();

	const subtypes = subtypesRaw.map((subtype) => ({
		...subtype,
		_id: subtype._id.toString(),
		createdAt: subtype.createdAt.toISOString(),
		updatedAt: subtype.updatedAt.toISOString()
	}));

	const availableProcessors = [
		{
			processor: 'stripe' as const,
			available: isStripeEnabled(),
			displayName: 'Stripe'
		},
		{
			processor: 'sumup' as const,
			available: isSumupEnabled(),
			displayName: 'SumUp'
		}
	];

	return {
		subtypes,
		availableProcessors
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();

		const parsed = z
			.object({
				slug: z
					.string()
					.min(1)
					.regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
				name: z.string().min(1),
				description: z.string().optional(),
				tapToPayProcessor: tapToPayProcessorEnum,
				tapToPayUrl: z.string().trim().optional()
			})
			.safeParse({
				slug: formData.get('slug'),
				name: formData.get('name'),
				description: formData.get('description'),
				tapToPayProcessor: formData.get('tapToPayProcessor') || '',
				tapToPayUrl: formData.get('tapToPayUrl') || ''
			});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.message });
		}

		const existing = await collections.posPaymentSubtypes.findOne({ slug: parsed.data.slug });
		if (existing) {
			return fail(400, { error: 'Subtype with this slug already exists' });
		}

		const maxSortOrder = await collections.posPaymentSubtypes
			.find({})
			.sort({ sortOrder: -1 })
			.limit(1)
			.toArray();

		const processor = asPaymentProcessor(parsed.data.tapToPayProcessor);

		const newSubtype: PosPaymentSubtype = {
			_id: new ObjectId(),
			slug: parsed.data.slug,
			name: parsed.data.name,
			description: parsed.data.description || undefined,
			tapToPay: processor
				? {
						processor,
						onActivationUrl: parsed.data.tapToPayUrl || undefined
				  }
				: undefined,
			sortOrder: (maxSortOrder[0]?.sortOrder ?? 0) + 1,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		await collections.posPaymentSubtypes.insertOne(newSubtype);

		return { success: true };
	},

	update: async ({ request }) => {
		const formData = await request.formData();

		const idParsed = z.object({ id: z.string().min(1) }).safeParse({ id: formData.get('id') });

		if (!idParsed.success) {
			return fail(400, { error: 'Invalid ID' });
		}

		const subtype = await collections.posPaymentSubtypes.findOne({
			_id: new ObjectId(idParsed.data.id)
		});

		if (!subtype) {
			return fail(404, { error: 'Subtype not found' });
		}

		if (subtype.slug === 'cash' && formData.get('disabled') === 'true') {
			return fail(400, { error: 'Cannot disable cash subtype' });
		}

		const parsed =
			subtype.slug === 'cash'
				? cashSubtypeUpdateSchema.safeParse({
						paymentDetailRequired: formData.get('paymentDetailRequired') === 'true'
				  })
				: regularSubtypeUpdateSchema.safeParse({
						name: formData.get('name'),
						description: formData.get('description'),
						tapToPayProcessor: formData.get('tapToPayProcessor') || '',
						tapToPayUrl: formData.get('tapToPayUrl') || '',
						disabled: formData.get('disabled') === 'true',
						paymentDetailRequired: formData.get('paymentDetailRequired') === 'true'
				  });

		if (!parsed.success) {
			return fail(400, { error: parsed.error.message });
		}

		let updateData: Partial<PosPaymentSubtype>;
		if (subtype.slug === 'cash') {
			updateData = {
				paymentDetailRequired: parsed.data.paymentDetailRequired,
				updatedAt: new Date()
			} satisfies Partial<PosPaymentSubtype>;
		} else {
			const data = parsed.data as z.infer<typeof regularSubtypeUpdateSchema>;
			const processor = asPaymentProcessor(data.tapToPayProcessor);
			updateData = {
				name: data.name,
				description: data.description || undefined,
				tapToPay: processor
					? { processor, onActivationUrl: data.tapToPayUrl || undefined }
					: undefined,
				disabled: data.disabled,
				paymentDetailRequired: data.paymentDetailRequired,
				updatedAt: new Date()
			} satisfies Partial<PosPaymentSubtype>;
		}

		const result = await collections.posPaymentSubtypes.updateOne(
			{ _id: new ObjectId(idParsed.data.id) },
			{ $set: updateData }
		);

		if (result.matchedCount === 0) {
			return fail(404, { error: 'Subtype not found' });
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = String(formData.get('id'));

		const subtype = await collections.posPaymentSubtypes.findOne({ _id: new ObjectId(id) });
		if (!subtype) {
			return fail(404, { error: 'Subtype not found' });
		}

		if (subtype.slug === 'cash') {
			return fail(400, { error: 'Cannot delete cash subtype' });
		}

		const ordersCount = await collections.orders.countDocuments({
			'payments.method': 'point-of-sale',
			'payments.posSubtype': subtype.slug
		});

		if (ordersCount > 0) {
			return fail(400, {
				error: `Cannot delete: ${ordersCount} orders use this subtype`
			});
		}

		await collections.posPaymentSubtypes.deleteOne({ _id: new ObjectId(id) });

		return { success: true };
	}
};
