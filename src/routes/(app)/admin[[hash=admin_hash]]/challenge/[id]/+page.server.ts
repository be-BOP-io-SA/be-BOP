import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database';
import { parsePriceAmount } from '$lib/types/Currency';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const actions = {
	update: async function ({ request, params }) {
		const challenge = await collections.challenges.findOne({
			_id: params.id
		});

		if (!challenge) {
			throw error(404, 'Challenge not found');
		}

		const data = await request.formData();

		// We don't allow changing the currency, or the mode
		const {
			name,
			goalAmount,
			progress,
			productIds,
			beginsAt,
			endsAt,
			progressChanged,
			oldProgress
		} = z
			.object({
				name: z.string().min(1).max(MAX_NAME_LIMIT),
				productIds: z.string().array(),
				goalAmount: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('0'),
				progress: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('0'),
				oldProgress: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('0'),
				progressChanged: z.boolean({ coerce: true }),
				beginsAt: z.date({ coerce: true }),
				endsAt: z.date({ coerce: true })
			})
			.parse({
				name: data.get('name'),
				productIds: JSON.parse(String(data.get('productIds'))).map(
					(x: { value: string }) => x.value
				),
				goalAmount: data.get('goalAmount'),
				progress: data.get('progress'),
				beginsAt: data.get('beginsAt'),
				endsAt: data.get('endsAt'),
				progressChanged: data.get('progressChanged'),
				oldProgress: data.get('oldProgress')
			});

		const amount =
			challenge.mode === 'moneyAmount' && challenge.goal.currency
				? parsePriceAmount(goalAmount, challenge.goal.currency)
				: parseInt(goalAmount);
		const parsedProgress =
			challenge.mode === 'moneyAmount' && challenge.goal.currency
				? parsePriceAmount(progress, challenge.goal.currency)
				: parseInt(progress);
		const parsedOldProgress =
			challenge.mode === 'moneyAmount' && challenge.goal.currency
				? parsePriceAmount(oldProgress, challenge.goal.currency)
				: parseInt(oldProgress);
		if (amount < 0 || isNaN(amount)) {
			throw error(400, 'Invalid amount');
		}

		const updateResult = await collections.challenges.updateOne(
			{
				_id: challenge._id,
				...(progressChanged && { progress: parsedOldProgress })
			},
			{
				$set: {
					name,
					productIds,
					'goal.amount': amount,
					progress: parsedProgress,
					beginsAt,
					endsAt,
					updatedAt: new Date()
				}
			}
		);

		if (!updateResult.matchedCount && progressChanged) {
			throw error(
				409,
				"A new order was made in parallel which updated the challenge's progress. Please try again"
			);
		}
	},

	delete: async function ({ params }) {
		await collections.challenges.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/challenge`);
	}
};
