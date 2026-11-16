import { runtimeConfig } from '$lib/server/runtime-config';
import { MANUAL } from '$lib/server/sdk/presentations';
import { definePaymentProcessor, type CreatePaymentResult } from '$lib/server/sdk/pp';
import declaration from './declaration';

/** The buyer wires the money; the shopowner reconciles it and marks the payment paid. */
export default definePaymentProcessor(declaration, {
	...MANUAL,

	isEnabled: () => !!runtimeConfig.sellerIdentity?.bank,

	// A wire can take days, and nothing on our side can cancel it.
	expiresIn: () => null,

	async createPayment(): Promise<CreatePaymentResult> {
		return { processor: 'bank-transfer', address: runtimeConfig.sellerIdentity?.bank?.iban };
	}
});
