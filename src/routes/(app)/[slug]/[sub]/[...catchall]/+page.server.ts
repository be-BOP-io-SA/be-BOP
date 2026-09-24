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
		// Nothing matched this URL. The shop's own error page is what gets rendered, but the
		// status has to say so: a 200 here is a soft 404, indexed as a real page and read as
		// healthy by monitoring.
		locals.status = 404;

		return {
			cmsPage: omit(errorPage, ['content']),
			cmsData: await cmsFromContent(
				{ desktopContent: errorPage.content, mobileContent: errorPage.mobileContent },
				locals
			),
			layoutReset: errorPage.fullScreen
		};
	} else {
		throw error(404, 'Page not found');
	}
}
