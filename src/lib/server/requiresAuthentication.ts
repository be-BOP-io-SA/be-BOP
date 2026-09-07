import type { Product } from '$lib/types/Product';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { isAuthenticated } from './discount';

export type ProductRequiringAuthentication = Pick<
	Product,
	'_id' | 'name' | 'requiresAuthentication'
>;

/**
 * At the counter the session belongs to the seller, not to the buyer, so asking the buyer to
 * log in would only ever identify the wrong person.
 */
function isEmployee(user: UserIdentifier | undefined): boolean {
	return user?.userRoleId !== undefined && user.userRoleId !== CUSTOMER_ROLE_ID;
}

/**
 * Products in the cart that cannot be ordered because nobody is identified yet, by name.
 * Empty when the order can go through — which is every case where the product carries no
 * requirement, the session is identified, or an employee is operating.
 *
 * "Identified" is what `/login` accepts: e-mail, nostr or SSO. An address typed into the
 * checkout form is not identity — it is unverified, and only ever a notification target.
 */
export function productsRequiringAuthentication(
	items: Array<{ product: ProductRequiringAuthentication }>,
	user: UserIdentifier | undefined
): string[] {
	if (isAuthenticated(user) || isEmployee(user)) {
		return [];
	}

	const names = new Map<string, string>();
	for (const { product } of items) {
		if (product.requiresAuthentication) {
			names.set(product._id, product.name);
		}
	}

	return [...names.values()];
}
