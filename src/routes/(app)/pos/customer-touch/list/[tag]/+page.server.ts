import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { pojo } from '$lib/server/pojo';
import { picturesForProducts } from '$lib/server/picture';

export const load = async ({ locals, params }) => {
	const tagId = params.tag;

	// Find the category config matching this tagId
	const category = runtimeConfig.customerTouchInterface?.categories?.find(
		(cat) => cat.tagId === tagId && !cat.isArchived
	);

	// Fetch CMS content if category has a cmsSlug
	let cmsCategory = null;
	let cmsCategoryData = null;

	if (category?.cmsSlug) {
		cmsCategory = await collections.cmsPages.findOne(
			{ _id: category.cmsSlug },
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
					title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] }
				}
			}
		);

		if (cmsCategory) {
			cmsCategoryData = cmsFromContent({ desktopContent: cmsCategory.content }, locals);
		}
	}

	// Find the tag and products
	const tag = await collections.tags.findOne({ _id: tagId });

	let products: Awaited<ReturnType<typeof collections.products.find>>[] = [];
	let pictures: Awaited<ReturnType<typeof picturesForProducts>> = [];

	if (tag) {
		products = await collections.products
			.find({ tagIds: tag._id })
			.sort({ updatedAt: -1 })
			.toArray();

		const productIds = products.map((product) => product._id);
		pictures = await picturesForProducts(productIds);
	}

	return {
		tagId,
		categoryLabel: category?.label || tag?.name || tagId,
		...(cmsCategory && {
			cmsCategory,
			cmsCategoryData
		}),
		products: products.map((product) => pojo(product)),
		pictures
	};
};
