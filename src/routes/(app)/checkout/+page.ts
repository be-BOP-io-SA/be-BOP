import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, data }) => {
	const res = await parent();

	if (!res.cart.items?.length) {
		throw redirect(303, '/cart');
	}

	return data;
};
