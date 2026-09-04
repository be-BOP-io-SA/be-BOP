import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error } from '@sveltejs/kit';

export const load = async ({ locals, params }) => {
	const categorySlug = params.slug;

	// Find the category config matching this slug and isCmsOnly
	const category = runtimeConfig.customerTouchInterface?.categories?.find(
		(cat) => cat.slug === categorySlug && cat.isCmsOnly && !cat.isArchived
	);

	if (!category) {
		throw error(404, 'Page not found');
	}

	// Fetch CMS content
	let cmsCategory = null;
	let cmsCategoryData = null;

	if (category.cmsSlug) {
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

	return {
		categoryLabel: category.label,
		...(cmsCategory && {
			cmsCategory,
			cmsCategoryData
		})
	};
};
