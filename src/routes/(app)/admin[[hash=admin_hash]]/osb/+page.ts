import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return {
		...data,
		bodyClass: 'max-w-7xl mx-auto'
	};
};
