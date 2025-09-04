import { collections } from '$lib/server/database';
import { picturesForProducts } from '$lib/server/picture.js';
import type { Product } from '$lib/types/Product';

export async function load({ locals }) {
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
