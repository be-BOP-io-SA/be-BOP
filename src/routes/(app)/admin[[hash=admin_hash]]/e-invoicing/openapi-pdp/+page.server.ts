import { runtimeConfig } from '$lib/server/runtime-config';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { openApiPdpAccessToken } from '$lib/server/e-invoice/platform/contrib/OpenApiPdp';
import { rateLimit } from '$lib/server/rateLimit';
import { z } from 'zod';

export function load() {
	return {
		openApiPdp: runtimeConfig.openApiPdp
	};
}

export const actions = {
	save: async ({ request }) => {
		const openApiPdp = z
			.object({
				baseUrl: z.string().url(),
				clientId: z.string().min(1),
				clientSecret: z.string().min(1)
			})
			.parse(Object.fromEntries(await request.formData()));

		runtimeConfig.openApiPdp = openApiPdp;
		await persistConfigElement('openApiPdp', openApiPdp);
	},

	delete: async () => {
		const openApiPdp = { baseUrl: '', clientId: '', clientSecret: '' };
		runtimeConfig.openApiPdp = openApiPdp;
		await persistConfigElement('openApiPdp', openApiPdp);
	},

	testConnection: async ({ locals }) => {
		rateLimit(locals.clientIp, 'admin.test.openapi-pdp', 5, { minutes: 1 });
		try {
			await openApiPdpAccessToken();
			return { ok: true };
		} catch (err) {
			console.error('testConnection(openapi-pdp) raw error:', err);
			return {
				ok: false,
				reason: 'Connection failed. Please verify the saved credentials and try again.'
			};
		}
	}
};
