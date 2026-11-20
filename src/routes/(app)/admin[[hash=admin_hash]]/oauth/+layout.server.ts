import { oauthProvidersForRole } from '$lib/server/oauth-providers';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		oauth: oauthProvidersForRole(runtimeConfig.oauth, locals.user?.role)
	};
};
