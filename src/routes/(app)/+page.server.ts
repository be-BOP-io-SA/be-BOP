import { collections } from '$lib/server/database';
import { fetchCatalog } from './catalog/+page.server';
import { cmsFromContent } from '$lib/server/cms';
import { redirect } from '@sveltejs/kit';
import { addYears } from 'date-fns';
import { omit } from '$lib/utils/omit';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import type { Actions, PageServerLoadEvent } from './$types';

// Private impl with a typed param and inferred (concrete) return so `data.catalog` stays
// typed for the page component. Annotating `load: PageServerLoad` directly would widen the
// return to the generic output shape and lose the concrete `catalog` type.
// The inferred return type is intentionally not annotated: this load returns a
// discriminated union ({ catalog } | { cmsPage, cmsData, layoutReset }) whose concrete
// shape must reach the page component. Annotating it (or widening via `: PageServerLoad`)
// collapses `data.catalog`/`data.cmsPage` to the generic output shape and breaks the
// component's typed props. The projected `cmsPage` shape can't be named cleanly either.
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
async function loadImpl({ locals, url }: PageServerLoadEvent) {
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
				hasMobileContent: 1,
				maintenanceDisplay: 1,
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
			catalog: await fetchCatalog(locals)
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
				mobileContent: (cmsPage.hasMobileContent && cmsPage.mobileContent) || undefined,
				employeeContent: (cmsPage.hasEmployeeContent && cmsPage.employeeContent) || undefined,
				forceContentVersion,
				forceUnsanitizedContent: cmsPage.displayRawContent
			},
			locals
		),
		layoutReset: cmsPage.fullScreen
	};
}

export const load = loadImpl;

export const actions: Actions = {
	navigate: async ({ locals, request }) => {
		const formData = await request.formData();
		let redirectTo = formData.get('redirectTo')?.toString() || '/';

		// Only allow redirect to public pages (not employee-only areas)
		if (
			!redirectTo.startsWith('/') ||
			redirectTo.startsWith('/admin') ||
			redirectTo.startsWith('/pos')
		) {
			redirectTo = '/';
		}

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
		throw redirect(303, redirectTo);
	}
};
