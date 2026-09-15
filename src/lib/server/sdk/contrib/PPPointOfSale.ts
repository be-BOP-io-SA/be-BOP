import { runtimeConfig } from '$lib/server/runtime-config';
import { MANUAL_PRESENTATION } from '../pp';
import type { PaymentProcessorDefinition, CreatePaymentResult } from '../pp';

/**
 * Cash, cheque or an external terminal: the cashier settles it and marks it paid.
 * Tap-to-pay is not handled here — activating it swaps the payment's processor for
 * the card provider that watches the terminal.
 */
export default {
	meta: { processor: 'point-of-sale', method: 'point-of-sale' },

	isEnabled: () => true,

	settlementCurrency: () => runtimeConfig.mainCurrency,

	presentation: MANUAL_PRESENTATION,

	// A till stays open as long as the shop does.
	expiresIn: () => null,

	async createPayment(): Promise<CreatePaymentResult> {
		return { processor: 'point-of-sale' };
	}
} satisfies PaymentProcessorDefinition;
