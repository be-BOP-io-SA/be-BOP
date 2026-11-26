import { MANUAL } from '$lib/server/sdk/presentations';
import { definePaymentProcessor, type CreatePaymentResult } from '$lib/server/sdk/pp';
import declaration from './declaration';

/** An order with nothing to pay. `addOrderPayment` stamps it paid on creation. */
export default definePaymentProcessor(declaration, {
	...MANUAL,

	isEnabled: () => true,

	async createPayment(): Promise<CreatePaymentResult> {
		return { processor: 'free' };
	}
});
