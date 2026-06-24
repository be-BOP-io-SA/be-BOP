import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const parentData = await parent();
	return {
		...parentData,
		bodyClass: 'max-w-7xl mx-auto'
	};
};
