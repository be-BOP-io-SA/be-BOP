import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { z } from 'zod';

export async function load() {
	return {
		osb: runtimeConfig.osb
	};
}

export const actions = paymentConfigActions({
	key: 'osb',
	processor: 'osb',
	schema: z.object({
		shopId: z.string().min(1),
		password: z.string().min(1),
		hmacKey: z.string().default('')
	})
});
