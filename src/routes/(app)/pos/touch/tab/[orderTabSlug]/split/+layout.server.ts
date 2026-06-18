import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({}) => {
	return {
		layoutReset: true
	};
};
