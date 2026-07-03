import { runtimeConfig } from '$lib/server/runtime-config';
import { collections } from '$lib/server/database';

export function load() {
	return {
		customPaymentMethod: runtimeConfig.customPaymentMethod
	};
}

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const customPaymentMethod = {
			enabled: formData.get('customPaymentMethodEnabled') === 'on',
			label: String(formData.get('customPaymentMethodLabel') ?? ''),
			instructions: String(formData.get('customPaymentMethodInstructions') ?? '')
		};

		await collections.runtimeConfig.updateOne(
			{ _id: 'customPaymentMethod' },
			{
				$set: { data: customPaymentMethod, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
		runtimeConfig.customPaymentMethod = customPaymentMethod;

		return { success: true };
	}
};
