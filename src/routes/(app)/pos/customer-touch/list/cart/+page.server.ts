import { getCartFromDb } from '$lib/server/cart';
import { userIdentifier } from '$lib/server/user';

export const load = async ({ locals }) => {
	const cart = getCartFromDb({ user: userIdentifier(locals) });
	return {
		cartTarget: (await cart).target
	};
};
