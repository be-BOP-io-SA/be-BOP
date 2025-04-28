import { collections } from '$lib/server/database';
import { cmsFromContent } from '$lib/server/cms';
import { omit } from '$lib/utils/omit';

export const load = async ({ params, locals }) => {
	const product = await collections.products.countDocuments({ _id: params.id });

	if (!product) {
		const errorPage = await collections.cmsPages.findOne(
			{
				_id: 'error'
			},
			{
				projection: {
					content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
					title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
					shortDescription: {
						$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
					},
					fullScreen: 1,
					maintenanceDisplay: 1,
					hideFromSEO: 1
				}
			}
		);

		if (errorPage) {
			return {
				cmsPage: omit(errorPage, ['content']),
				cmsData: cmsFromContent({ content: errorPage.content }, locals)
			};
		}
	}
};
