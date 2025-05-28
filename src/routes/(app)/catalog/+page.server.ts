import { collections } from '$lib/server/database';
import { picturesForProducts } from '$lib/server/picture.js';
import type { Product } from '$lib/types/Product';
import { CUSTOMER_ROLE_ID } from '$lib/types/User.js';
import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	if (locals?.user?.roleId === CUSTOMER_ROLE_ID || !locals.user?.roleId) {
		throw error(403, 'You are not allowed to access this page.');
	}
	const query = locals?.user?.hasPosOptions
		? { 'actionSettings.retail.visible': true }
		: { 'actionSettings.eShop.visible': true };

	const products = await collections.products
		.find(query)
		.project<Pick<Product, '_id' | 'price' | 'name'>>({
			price: 1,
			_id: 1,
			name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
		})
		.toArray();

	const productIds = products.map((product) => product._id);

	return {
		products: products,
		pictures: await picturesForProducts(productIds)
	};
}
