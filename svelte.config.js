import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		csrf: {
			// The check against cross-site form submissions is made in hooks.server.ts instead
			// (src/lib/server/csrf.ts), every route but the API v1, which authenticates with a header.
			trustedOrigins: ['*']
		}
	}
};

export default config;
