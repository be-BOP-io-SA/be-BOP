import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product';
import { error, redirect } from '@sveltejs/kit';
import { set } from 'lodash-es';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export async function load({ params }) {
	const leaderboard = await collections.leaderboards.findOne({
		_id: params.id
	});

	if (!leaderboard) {
		throw error(404, 'leaderboard not found');
	}

	const beginsAt = leaderboard.beginsAt;
	const endsAt = leaderboard.endsAt;
	const products = await collections.products
		.find({})
		.project<Pick<Product, 'name' | '_id'>>({ name: 1 })
		.toArray();

	return {
		leaderboard,
		beginsAt,
		endsAt,
		products
	};
}

export const actions = {
	update: async function ({ request, params }) {
		const leaderboard = await collections.leaderboards.findOne({
			_id: params.id
		});

		if (!leaderboard) {
			throw error(404, 'leaderboard not found');
		}

		const formData = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		// We don't allow changing the currency, or the mode
		const { name, progress, beginsAt, endsAt, progressChanged } = z
			.object({
				name: z.string().min(1).max(MAX_NAME_LIMIT),
				progress: z.array(
					z.object({
						productId: z.string().trim(),
						amount: z
							.string()
							.regex(/^\d+(\.\d+)?$/)
							.default('0'),
						currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]).default('SAT')
					})
				),
				progressChanged: z.boolean({ coerce: true }),
				beginsAt: z.date({ coerce: true }),
				endsAt: z.date({ coerce: true })
			})
			.parse({
				...json,
				productIds: JSON.parse(String(formData.get('productIds'))).map(
					(x: { value: string }) => x.value
				)
			});
		const progressParsed = progress
			.filter((prog) => leaderboard.productIds.includes(prog.productId))
			.map((prog) => ({
				...prog,
				amount: Math.max(parsePriceAmount(prog.amount, prog.currency), 0)
			}));

		const updateResult = await collections.leaderboards.updateOne(
			{
				_id: leaderboard._id
			},
			{
				$set: {
					name,
					...(progressChanged && { progress: progressParsed }),
					beginsAt,
					endsAt,
					updatedAt: new Date()
				}
			}
		);

		if (!updateResult.matchedCount && progressChanged) {
			throw error(
				409,
				"A new order was made in parallel which updated the leaderboard's progress. Please try again"
			);
		}
	},

	delete: async function ({ params }) {
		await collections.leaderboards.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/leaderboard`);
	}
};
