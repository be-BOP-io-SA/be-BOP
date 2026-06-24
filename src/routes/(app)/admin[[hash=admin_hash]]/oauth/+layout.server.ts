import { runtimeConfig } from '$lib/server/runtime-config';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	return {
		oauth: runtimeConfig.oauth
	};
};
