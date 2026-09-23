import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';

export async function load() {
	return {
		paypal: runtimeConfig.paypal
	};
}

export const actions = paymentConfigActions({ key: 'paypal', processor: 'paypal' });
