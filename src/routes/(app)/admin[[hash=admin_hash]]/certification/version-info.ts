import { PUBLIC_VERSION } from '$env/static/public';
import { ORIGIN } from '$lib/server/env-config';
import { runtimeConfig } from '$lib/server/runtime-config';

/** What the certification page and the certificate say about this be-BOP. */
export function versionInfo() {
	return {
		version: PUBLIC_VERSION || '—',
		shop: runtimeConfig.sellerIdentity?.businessName || runtimeConfig.brandName,
		address: ORIGIN
	};
}
