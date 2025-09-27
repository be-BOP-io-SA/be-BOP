import { UrlDependency } from '$lib/types/UrlDependency';
import { error, redirect } from '@sveltejs/kit';
import { fetchOrderForUser } from '../fetchOrderForUser';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';

export async function load({ params, depends, locals }) {
	depends(UrlDependency.Order);
	const order = await fetchOrderForUser(params.id);

	if (!locals.user) {
		throw redirect(303, '/admin/login');
	}
	if (locals.user.roleId === CUSTOMER_ROLE_ID) {
		throw error(403, 'You are not allowed to access this page, only employee accounts are.');
	}

	return {
		order
	};
}
