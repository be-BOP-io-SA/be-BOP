import { collections } from '$lib/server/database';
import { load as catalogLoad } from './catalog/+page.server';
import { cmsFromContent } from '$lib/server/cms';
import { redirect } from '@sveltejs/kit';
import { addYears } from 'date-fns';
import { omit } from '$lib/utils/omit';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';

export const load = async ({ locals, url }) => {
	const cmsPage = await collections.cmsPages.findOne(
		{
			_id: 'home'
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
		return {
			// @ts-expect-error only locals is needed
			catalog: catalogLoad({ locals })
		};
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
		cmsData: cmsFromContent(
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
};

export const actions = {
	navigate: async ({ locals }) => {
		await collections.sessions.updateOne(
			{
				sessionId: locals.sessionId
			},
			{
				$set: {
					updatedAt: new Date(),
					acceptAgeLimitation: true,
					expiresAt: addYears(new Date(), 1)
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
		throw redirect(303, `/`);
	}
};
