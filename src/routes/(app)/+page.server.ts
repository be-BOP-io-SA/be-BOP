import { collections } from '$lib/server/database';
import { omit } from 'lodash-es';
import { load as catalogLoad } from './catalog/+page.server';
import { cmsFromContent } from '$lib/server/cms';
import { redirect } from '@sveltejs/kit';
import { addYears } from 'date-fns';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';

export const load = async ({ locals }) => {
	const cmsPage = await collections.cmsPages.findOne(
		{
			_id: 'home'
		},
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
				mobileContent: {
					$ifNull: [`$translations.${locals.language}.mobileContent`, '$mobileContent']
				},
				employeeContent: {
					$ifNull: [`$translations.${locals.language}.employeeContent`, '$employeeContent']
				},
				hasEmployeeContent: 1,
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
				shortDescription: {
					$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
				},
				fullScreen: 1,
				maintenanceDisplay: 1
			}
		}
	);

	if (!cmsPage) {
		return {
			// @ts-expect-error only locals is needed
			catalog: catalogLoad({ locals })
		};
	}

	return {
		cmsPage: omit(cmsPage, ['content']),
		cmsData: cmsFromContent(
			{
				content:
					locals.user?.roleId !== undefined &&
					locals.user?.roleId !== CUSTOMER_ROLE_ID &&
					cmsPage.hasEmployeeContent &&
					cmsPage.employeeContent
						? cmsPage.employeeContent
						: cmsPage.content,
				mobileContent: cmsPage.mobileContent
			},
			locals
		),
		layoutReset: cmsPage.fullScreen
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
