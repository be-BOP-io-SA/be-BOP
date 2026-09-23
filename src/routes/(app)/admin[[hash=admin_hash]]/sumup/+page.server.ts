import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';

export async function load() {
	return {
		sumUp: runtimeConfig.sumUp
	};
}

export const actions = paymentConfigActions({ key: 'sumUp', processor: 'sumup' });
