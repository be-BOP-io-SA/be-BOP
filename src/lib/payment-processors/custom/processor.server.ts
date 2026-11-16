import { runtimeConfig } from '$lib/server/runtime-config';
import { MANUAL } from '$lib/server/sdk/presentations';
import { definePaymentProcessor, type CreatePaymentResult } from '$lib/server/sdk/pp';
import declaration from './declaration';

/**
 * A payment route the shop defined itself, with its own instructions. Which one was
 * chosen is snapshotted onto the payment, so later edits cannot rewrite an old order.
 */
export default definePaymentProcessor(declaration, {
	...MANUAL,

	isEnabled: () => runtimeConfig.customPaymentMethods.length > 0,

	// The shop sets its own terms; we cannot know when they lapse.
	expiresIn: () => null,

	async createPayment(): Promise<CreatePaymentResult> {
		return { processor: 'custom' };
	}
});
