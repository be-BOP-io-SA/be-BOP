import { runtimeConfig } from '$lib/server/runtime-config';
import { MANUAL_PRESENTATION } from '../pp';
import type { PaymentProcessorDefinition, CreatePaymentResult } from '../pp';

/**
 * A payment route the shop defined itself, with its own instructions. Which one was
 * chosen is snapshotted onto the payment, so later edits cannot rewrite an old order.
 */
export default {
	meta: { processor: 'custom', method: 'custom' },

	isEnabled: () => runtimeConfig.customPaymentMethods.length > 0,

	settlementCurrency: () => runtimeConfig.mainCurrency,

	presentation: MANUAL_PRESENTATION,

	// The shop sets its own terms; we cannot know when they lapse.
	expiresIn: () => null,

	async createPayment(): Promise<CreatePaymentResult> {
		return { processor: 'custom' };
	}
} satisfies PaymentProcessorDefinition;
