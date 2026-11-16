import { runtimeConfig, type RuntimeConfig } from '$lib/server/runtime-config';
import type { Price } from '$lib/types/Order';
import { toCurrency } from '$lib/utils/toCurrency';
import { toSatoshis } from '../utils/toSatoshis';

/** The blocks a payment waits for under a grid of any currency: the amount is read in the grid's. */
export function confirmationBlocksFor(
	price: Price,
	grid: RuntimeConfig['confirmationBlocksThresholds']
): number {
	const amount = toCurrency(grid.currency, price.amount, price.currency);

	return (
		grid.thresholds.find(
			(threshold) => amount >= threshold.minAmount && amount <= threshold.maxAmount
		)?.confirmationBlocks ?? grid.defaultBlocks
	);
}

export function getConfirmationBlocks(price: Price) {
	const orderAmountSats = toSatoshis(price.amount, price.currency);

	let confirmationBlocks = runtimeConfig.confirmationBlocksThresholds.defaultBlocks;

	for (const threshold of runtimeConfig.confirmationBlocksThresholds.thresholds) {
		const minAmountInSat = toSatoshis(
			threshold.minAmount,
			runtimeConfig.confirmationBlocksThresholds.currency
		);
		const maxAmountInSat = toSatoshis(
			threshold.maxAmount,
			runtimeConfig.confirmationBlocksThresholds.currency
		);

		if (orderAmountSats >= minAmountInSat && orderAmountSats <= maxAmountInSat) {
			confirmationBlocks = threshold.confirmationBlocks;
			break;
		}
	}

	return confirmationBlocks;
}
