import { runtimeConfig } from '$lib/server/runtime-config';
import { MANUAL_PRESENTATION } from '../pp';
import type { PaymentProcessorDefinition, CreatePaymentResult } from '../pp';

/** The buyer wires the money; the shopowner reconciles it and marks the payment paid. */
export default {
	meta: { processor: 'bank-transfer', method: 'bank-transfer' },

	isEnabled: () => !!runtimeConfig.sellerIdentity?.bank,

	settlementCurrency: () => runtimeConfig.mainCurrency,

	presentation: MANUAL_PRESENTATION,

	// A wire can take days, and nothing on our side can cancel it.
	expiresIn: () => null,

	async createPayment(): Promise<CreatePaymentResult> {
		return { processor: 'bank-transfer', address: runtimeConfig.sellerIdentity?.bank?.iban };
	}
} satisfies PaymentProcessorDefinition;
