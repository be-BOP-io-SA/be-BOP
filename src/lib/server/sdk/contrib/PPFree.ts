import { runtimeConfig } from '$lib/server/runtime-config';
import { MANUAL_PRESENTATION } from '../pp';
import type { PaymentProcessorDefinition, CreatePaymentResult } from '../pp';

/** An order with nothing to pay. `addOrderPayment` stamps it paid on creation. */
export default {
	meta: { processor: 'free', method: 'free' },

	isEnabled: () => true,

	settlementCurrency: () => runtimeConfig.mainCurrency,

	presentation: MANUAL_PRESENTATION,

	async createPayment(): Promise<CreatePaymentResult> {
		return { processor: 'free' };
	}
} satisfies PaymentProcessorDefinition;
