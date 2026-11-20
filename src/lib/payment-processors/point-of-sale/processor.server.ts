import { MANUAL } from '$lib/server/sdk/presentations';
import { definePaymentProcessor, type CreatePaymentResult } from '$lib/server/sdk/pp';
import declaration from './declaration';

/**
 * Cash, cheque or an external terminal: the cashier settles it and marks it paid.
 * Tap-to-pay is not handled here — activating it swaps the payment's processor for
 * the card provider that watches the terminal.
 */
export default definePaymentProcessor(declaration, {
	...MANUAL,

	isEnabled: () => true,

	// A till stays open as long as the shop does.
	expiresIn: () => null,

	async createPayment(): Promise<CreatePaymentResult> {
		return { processor: 'point-of-sale' };
	}
});
