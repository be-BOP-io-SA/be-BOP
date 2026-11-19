import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES } from '$lib/types/Currency';
import type { Price } from '$lib/types/Order';
import { set } from '$lib/utils/set';
import { toCurrency } from '$lib/utils/toCurrency';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

/**
 * Zcash keeps its own grid of confirmations: a block comes every 75 seconds, a bitcoin one every
 * ten minutes, so the bitcoin grid would wait far too little.
 */

/** The blocks a payment waits for: the amount is read in the grid's currency. */
export function confirmationBlocksFor(price: Price): number {
	const grid = runtimeConfig.zcashConfirmationBlocksThresholds;
	const amount = toCurrency(grid.currency, price.amount, price.currency);

	return (
		grid.thresholds.find(
			(threshold) => amount >= threshold.minAmount && amount <= threshold.maxAmount
		)?.confirmationBlocks ?? grid.defaultBlocks
	);
}

/** Saves the grid sent by the confirmation thresholds form of the Zcash nodeless page. */
export async function saveConfirmationThresholds(formData: FormData) {
	const json: JsonObject = {};
	for (const [field, value] of formData) {
		set(json, field, value);
	}

	const confirmationThresholds = z
		.object({
			currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]),
			defaultBlocks: z.number({ coerce: true }).int().min(0),
			thresholds: z.array(
				z.object({
					minAmount: z.number({ coerce: true }).min(0),
					maxAmount: z.number({ coerce: true }).min(0),
					confirmationBlocks: z.number({ coerce: true }).int().min(0)
				})
			)
		})
		.parse(json);

	confirmationThresholds.thresholds.sort((a, b) => a.minAmount - b.minAmount);

	await collections.runtimeConfig.updateOne(
		{ _id: 'zcashConfirmationBlocksThresholds' },
		{
			$set: { data: confirmationThresholds, updatedAt: new Date() },
			$setOnInsert: { createdAt: new Date() }
		},
		{ upsert: true }
	);

	runtimeConfig.zcashConfirmationBlocksThresholds = confirmationThresholds;
}
