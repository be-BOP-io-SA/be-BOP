import { error, redirect } from '@sveltejs/kit';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { fetchOrderForUser } from '../fetchOrderForUser';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const order = await fetchOrderForUser(params.id);
	if (!locals.user) {
		throw redirect(303, '/admin/login');
	}
	if (locals.user.roleId === CUSTOMER_ROLE_ID) {
		throw error(403, 'You are not allowed to access this page, only employee accounts are.');
	}
	if (!order) {
		throw error(404, 'Order not found');
	}

	if (!runtimeConfig.sellerIdentity && !order.sellerIdentity) {
		throw error(400, 'Seller identity is not set');
	}
	return {
		order,
		layoutReset: true,
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		sellerIdentity: (order.sellerIdentity || runtimeConfig.sellerIdentity)!
	};
};
