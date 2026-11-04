import { collections } from '$lib/server/database.js';
import { cmsRemovedContent } from '$lib/server/cms';
import { ALLOW_JS_INJECTION } from '$lib/server/env-config';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const cmsPage = await collections.cmsPages.findOne({
		_id: params.slug
	});

	if (!cmsPage) {
		throw error(404, 'Page not found');
	}

	const sanitized = !cmsPage.displayRawContent && ALLOW_JS_INJECTION !== 'true';
	const contents = [cmsPage, ...Object.values(cmsPage.translations ?? {})].flatMap((version) => [
		version?.content ?? '',
		version?.mobileContent ?? '',
		version?.employeeContent ?? ''
	]);

	return {
		cmsPage,
		removedContent: sanitized ? [...new Set(contents.flatMap(cmsRemovedContent))] : []
	};
}
