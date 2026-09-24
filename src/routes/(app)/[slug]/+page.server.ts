import { collections } from '$lib/server/database';
import { cmsFromContent } from '$lib/server/cms.js';
import { error } from '@sveltejs/kit';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { omit } from '$lib/utils/omit';

export async function load({ params, locals, url }) {
	let cmsPage = await collections.cmsPages.findOne(
		{
			_id: params.slug
		},
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
				employeeContent: {
					$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
				},
				fullScreen: 1,
				hasEmployeeContent: 1,
				displayRawContent: 1,
				hasMobileContent: 1,
				hideFromSEO: 1,
				maintenanceDisplay: 1,
				metas: 1,
				mobileContent: {
					$ifNull: [`$translations.${locals.language}.mobileContent`, '$mobileContent']
				},
				shortDescription: {
					$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
				},
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] }
			}
		}
	);

	if (!cmsPage) {
		cmsPage = await collections.cmsPages.findOne(
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
					hideFromSEO: 1,
					hasMobileContent: 1
				}
			}
		);

		if (!cmsPage) {
			throw error(404, 'Page not found');
		}

		// The shop's own error page is what the visitor sees, but the request still failed to
		// find anything: answering 200 makes this a soft 404, which search engines index as a
		// real page and uptime checks read as healthy.
		locals.status = 404;
	}

	const forceContentVersion =
		locals.user?.roleId !== undefined && locals.user?.roleId !== CUSTOMER_ROLE_ID
			? 'employee'
			: url.searchParams.get('content') === 'desktop'
			? 'desktop'
			: url.searchParams.get('content') === 'mobile'
			? 'mobile'
			: undefined;

	return {
		cmsPage: omit(cmsPage, ['content', 'mobileContent', 'employeeContent']),
		cmsData: await cmsFromContent(
			{
				desktopContent: cmsPage.content,
				employeeContent: (cmsPage.hasEmployeeContent && cmsPage.employeeContent) || undefined,
				mobileContent: (cmsPage.hasMobileContent && cmsPage.mobileContent) || undefined,
				forceContentVersion,
				forceUnsanitizedContent: cmsPage.displayRawContent
			},
			locals
		),
		layoutReset: cmsPage.fullScreen,
		websiteShortDescription: cmsPage.shortDescription
	};
}
