import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return {
		...data,
		bodyClass: 'no-sticky-actions'
	};
};
