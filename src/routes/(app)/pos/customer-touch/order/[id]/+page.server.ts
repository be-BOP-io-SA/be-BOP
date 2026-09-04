import { UrlDependency } from '$lib/types/UrlDependency.js';
import { fetchOrderForUser } from '../../../../order/[id]/fetchOrderForUser.js';

export async function load({ params, depends, locals }) {
	depends(UrlDependency.Order);
	const order = await fetchOrderForUser(params.id, { userRoleId: locals.user?.roleId });

	return {
		order
	};
}
