import { runtimeConfig } from '$lib/server/runtime-config';
import type { Price } from '$lib/types/Order';
import { toSatoshis } from '../utils/toSatoshis';

export function getConfirmationBlocks(price: Price): number {
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
