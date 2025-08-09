import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import type { Product } from '$lib/types/Product';

export const load = async ({ params, locals }) => {
	const product = await collections.products.findOne<
		Pick<
			Product,
			| '_id'
			| 'name'
			| 'price'
			| 'shortDescription'
			| 'description'
			| 'availableDate'
			| 'preorder'
			| 'customPreorderText'
			| 'type'
			| 'shipping'
			| 'displayShortDescription'
			| 'payWhatYouWant'
			| 'standalone'
			| 'maxQuantityPerOrder'
			| 'stock'
			| 'actionSettings'
			| 'contentBefore'
			| 'contentAfter'
			| 'deposit'
			| 'cta'
			| 'maximumPrice'
			| 'recommendedPWYWAmount'
			| 'mobile'
			| 'hasVariations'
			| 'variations'
			| 'variationLabels'
			| 'sellDisclaimer'
			| 'hasSellDisclaimer'
			| 'hideFromSEO'
			| 'hideDiscountExpiration'
			| 'bookingSpec'
		>
	>(
		{ _id: params.slug },
		{
			projection: {
				_id: 1,
				name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] },
				price: 1,
				shortDescription: {
					$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
				},
				description: { $ifNull: [`$translations.${locals.language}.description`, '$description'] },
				availableDate: 1,
				preorder: 1,
				customPreorderText: {
					$ifNull: [`$translations.${locals.language}.customPreorderText`, '$customPreorderText']
				},
				type: 1,
				displayShortDescription: 1,
				payWhatYouWant: 1,
				standalone: 1,
				maxQuantityPerOrder: 1,
				stock: 1,
				actionSettings: 1,
				contentBefore: {
					$ifNull: [`$translations.${locals.language}.contentBefore`, '$contentBefore']
				},
				contentAfter: {
					$ifNull: [`$translations.${locals.language}.contentAfter`, '$contentAfter']
				},
				deposit: 1,
				cta: { $ifNull: [`$translations.${locals.language}.cta`, '$cta'] },
				hasVariations: 1,
				variationLabels: {
					$ifNull: [`$translations.${locals.language}.variationLabels`, '$variationLabels']
				},
				variations: 1,
				maximumPrice: 1,
				recommendedPWYWAmount: 1,
				mobile: 1,
				sellDisclaimer: {
					$ifNull: [`$translations.${locals.language}.sellDisclaimer`, '$sellDisclaimer']
				},
				hasSellDisclaimer: 1,
				hideFromSEO: 1,
				hideDiscountExpiration: 1,
				shipping: 1,
				bookingSpec: 1
			}
		}
	);

	if (!product) {
		throw error(404, 'Page not found');
	}

	const pictures = collections.pictures
		.find({ productId: params.slug })
		.sort({ order: 1, createdAt: 1 })
		.toArray();
	return {
		product,
		pictures
	};
};
