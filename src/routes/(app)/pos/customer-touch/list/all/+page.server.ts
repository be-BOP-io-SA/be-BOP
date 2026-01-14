import { collections } from '$lib/server/database';
import { pojo } from '$lib/server/pojo';
import { picturesForProducts } from '$lib/server/picture';

export const load = async () => {
	// Find the pos-cti tag
	const posCtiTag = await collections.tags.findOne({ _id: 'pos-cti' });

	if (!posCtiTag) {
		return {
			products: [],
			pictures: []
		};
	}

	// Find products with the pos-cti tag
	const products = await collections.products
		.find({ tagIds: posCtiTag._id })
		.sort({ updatedAt: -1 })
		.toArray();

	const productIds = products.map((product) => product._id);

	return {
		products: products.map((product) => pojo(product)),
		pictures: await picturesForProducts(productIds)
	};
};
