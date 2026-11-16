import { oauthProvidersForRole } from '$lib/server/oauth-providers';
import { runtimeConfig } from '$lib/server/runtime-config';

export async function load({ locals }) {
	return {
		oauth: oauthProvidersForRole(runtimeConfig.oauth, locals.user?.role)
	};
}
