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
				mobileContent: {
					$ifNull: [`$translations.${locals.language}.mobileContent`, '$mobileContent']
				},
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
				shortDescription: {
					$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
				},
				employeeContent: {
					$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
				},
				fullScreen: 1,
				maintenanceDisplay: 1,
				hideFromSEO: 1,
				hasMobileContent: 1,
				metas: 1,
				hasEmployeeContent: 1
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
	}

	const showEmployeeContent =
		locals.user?.roleId !== undefined &&
		locals.user?.roleId !== CUSTOMER_ROLE_ID &&
		!!cmsPage.hasEmployeeContent &&
		!!cmsPage.employeeContent;
	const showMobileContent = !!cmsPage.hasMobileContent && !!cmsPage.mobileContent;

	let content;
	let mobileContent;

	if (url.searchParams.get('content') === 'desktop' || !showMobileContent) {
		content = cmsPage.content;
	} else if (url.searchParams.get('content') === 'mobile' && cmsPage.mobileContent) {
		showMobileContent satisfies true;
		content = cmsPage.mobileContent;
	} else {
		content = cmsPage.content;
		mobileContent = cmsPage.mobileContent;
	}

	if (showEmployeeContent && cmsPage.employeeContent) {
		content = cmsPage.employeeContent;
	}

	return {
		cmsPage: omit(cmsPage, ['content', 'mobileContent', 'employeeContent']),
		cmsData: cmsFromContent(
			{
				content,
				...{ mobileContent }
			},
			locals
		),
		layoutReset: cmsPage.fullScreen,
		websiteShortDescription: cmsPage.shortDescription
	};
}
