import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';

export async function load() {
	return {
		stripe: runtimeConfig.stripe
	};
}

export const actions = paymentConfigActions({ key: 'stripe', processor: 'stripe' });
