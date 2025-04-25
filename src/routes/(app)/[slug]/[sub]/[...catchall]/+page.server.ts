import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';
import { omit } from '$lib/utils/omit';
import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	const errorPage = await collections.cmsPages.findOne(
		{
			_id: 'error'
		},
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
				mobileContent: {
					$ifNull: [`$translations.${locals.language}.mobileContent`, '$mobileContent']
				},
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
			cmsData: cmsFromContent(
				{ content: errorPage.content, mobileContent: errorPage.mobileContent },
				locals
			),
			layoutReset: errorPage.fullScreen
		};
	} else {
		throw error(404, 'Page not found');
	}
}
