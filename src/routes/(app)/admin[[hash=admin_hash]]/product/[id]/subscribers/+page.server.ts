import { collections } from '$lib/server/database';
import { error, fail } from '@sveltejs/kit';
import { userQuery } from '$lib/server/user';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import type { Actions } from './$types';
import { z } from 'zod';

export const load = async ({ params }) => {
	const product = await collections.products.findOne({ _id: params.id });
	const subscriptions = await collections.paidSubscriptions
		.find({ productId: params.id })
		.toArray();

	if (!product) {
		throw error(404, 'Product not found');
	}

	return {
		subscriptions: subscriptions.map((subscription) => ({
			_id: subscription._id,
			paidUntil: subscription.paidUntil,
			updatedAt: subscription.updatedAt,
			cancelledAt: subscription.cancelledAt,
			user: {
				email: subscription.user.email,
				npub: subscription.user.npub
			}
		}))
	};
};

// Zod schemas
const subscriberSchema = z.object({
	emailOrNpub: z.string().trim().min(1, 'Email or npub required'),
	paidUntil: z
		.string()
		.refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid date format' })
});

const csvRowSchema = z
	.object({
		email: z.string().email().optional().or(z.literal('')),
		npub: z.string().startsWith('npub1', 'Invalid npub format').optional().or(z.literal('')),
		paidUntil: z
			.string()
			.refine((val) => !isNaN(new Date(val).getTime()), { message: 'Invalid date format' })
	})
	.refine((data) => data.email || data.npub, { message: 'Either email or npub is required' });

const bulkIdsSchema = z.array(z.string().uuid()).min(1, 'At least one ID required');

const subscriptionIdSchema = z.string().uuid('Invalid subscription ID format');

const csvContentSchema = z.string().trim().min(1, 'CSV content required');

function parseEmailOrNpub(input: string): { email?: string; npub?: string } {
	const trimmed = input.trim();
	if (trimmed.startsWith('npub1')) {
		return { npub: trimmed };
	}
	return { email: trimmed };
}

// Build UserIdentifier from email/npub
function buildUserIdentifier(data: { email?: string; npub?: string }): UserIdentifier {
	return {
		...(data.email ? { email: data.email } : {}),
		...(data.npub ? { npub: data.npub } : {})
	};
}

// Generate bulk subscription numbers (single DB call)
async function generateBulkSubscriptionNumbers(count: number): Promise<number> {
	const res = await collections.runtimeConfig.findOneAndUpdate(
		{ _id: 'subscriptionNumber' },
		{ $inc: { data: count as never } },
		{ upsert: true, returnDocument: 'after' }
	);

	if (!res.value) {
		throw new Error('Failed to increment subscription number');
	}

	return (res.value.data as number) - count + 1;
}

// Create subscription objects
function createSubscriptionObjects(
	subscribers: Array<{ email?: string; npub?: string; paidUntil: string }>,
	productId: string,
	startNumber: number
) {
	return subscribers.map((data, index) => ({
		_id: crypto.randomUUID(),
		number: startNumber + index,
		user: buildUserIdentifier(data),
		productId,
		paidUntil: new Date(data.paidUntil),
		notifications: [],
		createdAt: new Date(),
		updatedAt: new Date()
	}));
}

// Parse and validate IDs from FormData
function parseIdsFromFormData(formData: FormData): string[] | { error: string } {
	const idsJson = formData.get('ids')?.toString();

	if (!idsJson) {
		return { error: 'No IDs provided' };
	}

	try {
		const parsed = JSON.parse(idsJson);
		const result = bulkIdsSchema.safeParse(parsed);

		if (!result.success) {
			return { error: result.error.errors[0].message };
		}

		return result.data;
	} catch {
		return { error: 'Invalid JSON format' };
	}
}

export const actions: Actions = {
	addSubscriber: async ({ request, params }) => {
		const formData = await request.formData();

		const product = await collections.products.findOne({
			_id: params.id,
			type: 'subscription'
		});

		if (!product) {
			return fail(404, { error: 'Subscription product not found' });
		}

		// Parse all subscribers from form (functional style)
		const MAX_SUBSCRIBER_LINES = 100;
		const subscribers = Array.from({ length: MAX_SUBSCRIBER_LINES }, (_, i) => ({
			emailOrNpub: formData.get(`subscribers[${i}].emailOrNpub`)?.toString().trim(),
			paidUntil: formData.get(`subscribers[${i}].paidUntil`)?.toString()
		}))
			.filter((sub) => sub.emailOrNpub && sub.paidUntil)
			.map((sub) => ({
				emailOrNpub: sub.emailOrNpub as string,
				paidUntil: sub.paidUntil as string
			}));

		if (subscribers.length === 0) {
			return fail(400, { error: 'At least one subscriber required' });
		}

		// Validate with Zod
		const validated = subscribers.map((sub) => {
			const result = subscriberSchema.safeParse(sub);
			if (!result.success) {
				return { error: result.error.errors[0].message };
			}

			const parsed = parseEmailOrNpub(result.data.emailOrNpub);
			if (!parsed.email && !parsed.npub) {
				return { error: 'Invalid email or npub format' };
			}

			return { parsed, paidUntil: result.data.paidUntil };
		});

		const errors = validated.filter((v) => 'error' in v);
		if (errors.length > 0) {
			return fail(400, { error: errors[0].error });
		}

		// Check for duplicates
		const duplicateChecks = await Promise.all(
			validated.map(async (v) => {
				if ('error' in v) {
					return null;
				}
				const user = buildUserIdentifier(v.parsed);

				return collections.paidSubscriptions.findOne({
					...userQuery(user),
					productId: params.id
				});
			})
		);

		if (duplicateChecks.some((d) => d !== null)) {
			return fail(400, { error: 'One or more subscriptions already exist' });
		}

		// Generate subscription numbers in bulk (one DB call instead of N)
		const startNumber = await generateBulkSubscriptionNumbers(validated.length);

		// Create all subscriptions
		const subscribersData = validated.map((v) => {
			if ('error' in v) {
				throw new Error('Validation failed');
			}
			return { ...v.parsed, paidUntil: v.paidUntil };
		});

		const newSubs = createSubscriptionObjects(subscribersData, params.id, startNumber);

		await collections.paidSubscriptions.insertMany(newSubs);

		return { success: true, added: newSubs.length };
	},

	importCsv: async ({ request, params }) => {
		const formData = await request.formData();
		const csvContentRaw = formData.get('csvContent')?.toString();

		const csvValidation = csvContentSchema.safeParse(csvContentRaw);
		if (!csvValidation.success) {
			return fail(400, { error: csvValidation.error.errors[0].message });
		}

		const csvContent = csvValidation.data;

		const product = await collections.products.findOne({
			_id: params.id,
			type: 'subscription'
		});

		if (!product) {
			return fail(404, { error: 'Subscription product not found' });
		}

		const lines = csvContent.split('\n').filter((line) => line.trim());

		if (lines.length === 0) {
			return fail(400, { error: 'CSV file is empty' });
		}

		const rows = lines.slice(1);

		if (rows.length === 0) {
			return fail(400, { error: 'No data rows in CSV' });
		}

		if (rows.length > 10000) {
			return fail(400, { error: 'CSV exceeds 10,000 row limit' });
		}

		const parseRow = (line: string, rowIndex: number) => {
			const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
			const [email, npub, paidUntil] = values;

			const rowData = {
				email: email || '',
				npub: npub || '',
				paidUntil: paidUntil || ''
			};

			const result = csvRowSchema.safeParse(rowData);

			if (!result.success) {
				return {
					data: {
						email: email || undefined,
						npub: npub || undefined,
						paidUntil: paidUntil || ''
					},
					errors: result.error.errors.map((err) => ({
						row: rowIndex + 2,
						error: err.message,
						data: line
					})),
					rowIndex: rowIndex + 2
				};
			}

			return {
				data: {
					email: result.data.email || undefined,
					npub: result.data.npub || undefined,
					paidUntil: result.data.paidUntil
				},
				errors: [],
				rowIndex: rowIndex + 2
			};
		};

		const parsedRows = rows.map((line, index) => parseRow(line, index)).filter((r) => r.data);

		const validationErrors = parsedRows.flatMap((r) => r.errors);

		if (validationErrors.length > 0) {
			return fail(400, {
				errors: validationErrors,
				message: `CSV validation failed. Found ${validationErrors.length} error(s). No records imported.`
			});
		}

		const duplicateChecks = await Promise.all(
			parsedRows.map(async ({ data, rowIndex }) => {
				const user = buildUserIdentifier(data);
				const exists = await collections.paidSubscriptions.findOne({
					...userQuery(user),
					productId: params.id
				});

				return exists
					? {
							row: rowIndex,
							error: 'Duplicate subscription already exists',
							data: `${data.email || ''}, ${data.npub || ''}`
					  }
					: null;
			})
		);

		const duplicateErrors = duplicateChecks.filter((e) => e !== null);

		if (duplicateErrors.length > 0) {
			return fail(400, {
				errors: duplicateErrors,
				message: `Found ${duplicateErrors.length} duplicate subscription(s). No records imported.`
			});
		}

		// Generate subscription numbers in bulk (one DB call instead of N)
		const startNumber = await generateBulkSubscriptionNumbers(parsedRows.length);

		const subscribersData = parsedRows.map(({ data }) => data);
		const subscriptions = createSubscriptionObjects(subscribersData, params.id, startNumber);

		await collections.paidSubscriptions.insertMany(subscriptions);

		return { success: true, imported: subscriptions.length };
	},

	cancelSubscriber: async ({ request, params }) => {
		const formData = await request.formData();
		const subscriptionId = formData.get('subscriptionId')?.toString();

		if (!subscriptionId) {
			return fail(400, { error: 'Subscription ID required' });
		}

		const validationResult = subscriptionIdSchema.safeParse(subscriptionId);
		if (!validationResult.success) {
			return fail(400, { error: validationResult.error.errors[0].message });
		}

		const result = await collections.paidSubscriptions.updateOne(
			{
				_id: validationResult.data,
				productId: params.id
			},
			{
				$set: {
					cancelledAt: new Date(),
					updatedAt: new Date()
				}
			}
		);

		if (result.matchedCount === 0) {
			return fail(404, { error: 'Subscription not found' });
		}

		return { success: true, cancelled: true };
	},

	deleteSubscriber: async ({ request, params }) => {
		const formData = await request.formData();
		const subscriptionId = formData.get('subscriptionId')?.toString();

		if (!subscriptionId) {
			return fail(400, { error: 'Subscription ID required' });
		}

		const validationResult = subscriptionIdSchema.safeParse(subscriptionId);
		if (!validationResult.success) {
			return fail(400, { error: validationResult.error.errors[0].message });
		}

		const result = await collections.paidSubscriptions.deleteOne({
			_id: validationResult.data,
			productId: params.id
		});

		if (result.deletedCount === 0) {
			return fail(404, { error: 'Subscription not found' });
		}

		return { success: true, deleted: true };
	},

	bulkDelete: async ({ request, params }) => {
		const formData = await request.formData();
		const ids = parseIdsFromFormData(formData);

		if ('error' in ids) {
			return fail(400, ids);
		}

		const result = await collections.paidSubscriptions.deleteMany({
			_id: { $in: ids },
			productId: params.id
		});

		return { success: true, bulkDeleted: result.deletedCount };
	},

	bulkCancel: async ({ request, params }) => {
		const formData = await request.formData();
		const ids = parseIdsFromFormData(formData);

		if ('error' in ids) {
			return fail(400, ids);
		}

		const result = await collections.paidSubscriptions.updateMany(
			{
				_id: { $in: ids },
				productId: params.id
			},
			{
				$set: {
					cancelledAt: new Date(),
					updatedAt: new Date()
				}
			}
		);

		return { success: true, bulkCancelled: result.modifiedCount };
	}
};
