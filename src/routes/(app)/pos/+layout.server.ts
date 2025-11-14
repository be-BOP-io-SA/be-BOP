import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Product } from '$lib/types/Product';
import type { Tag } from '$lib/types/Tag';

async function getProductsToDisplay(params: {
	query: Record<string, unknown>;
	language?: string;
}): Promise<
	Pick<Product, '_id' | 'price' | 'name' | 'preorder' | 'availableDate' | 'tagIds' | 'stock'>[]
> {
	return collections.products
		.find({
			...params.query
		})
		.project<
			Pick<Product, '_id' | 'price' | 'name' | 'preorder' | 'availableDate' | 'tagIds' | 'stock'>
		>({
			price: 1,
			preorder: 1,
			name: params.language ? { $ifNull: [`$translations.${params.language}.name`, '$name'] } : 1,
			availableDate: 1,
			tagIds: 1,
			stock: 1
		})
		.sort({ createdAt: 1 })
		.toArray();
}

export const load = async ({ locals }) => {
	const products = await getProductsToDisplay({
		language: locals.language,
		query: locals.user?.hasPosOptions
			? { 'actionSettings.retail.visible': true }
			: { 'actionSettings.eShop.visible': true }
	});
	const tags = await collections.tags
		.find({ _id: { $in: [...runtimeConfig.posTouchTag] } })
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	const pictures = await collections.pictures
		.find({ productId: { $in: [...products.map((product) => product._id)] } })
		.sort({ order: 1, createdAt: 1 })
		.toArray();
	return {
		layoutReset: true,
		pictures,
		products,
		tags,
		posUseSelectForTags: runtimeConfig.posUseSelectForTags
	};
};
