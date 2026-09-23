import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';

export async function load() {
	return {
		taler: runtimeConfig.taler
	};
}

export const actions = paymentConfigActions({ key: 'taler', processor: 'taler' });
