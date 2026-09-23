import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';

export async function load() {
	return {
		osb: runtimeConfig.osb
	};
}

export const actions = paymentConfigActions({ key: 'osb', processor: 'osb' });
