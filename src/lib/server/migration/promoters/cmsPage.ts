import { collections } from '../../database';
import type { CMSPage } from '$lib/types/CmsPage';
import type { MigrationPromoter } from '../promoter';

interface NormalizedCmsPage {
	title?: string;
	slug?: string;
	content?: string;
	excerpt?: string;
}

/**
 * Generate a be-BOP CMSPage._id from a slug, suffixing on collision so a
 * second promote of a same-slug page doesn't overwrite an existing one.
 */
async function pickAvailableId(slug: string): Promise<string> {
	const base = slug.trim() || 'imported-page';
	if (!(await collections.cmsPages.findOne({ _id: base }))) return base;
	for (let i = 2; i < 1000; i++) {
		const candidate = `${base}-${i}`;
		if (!(await collections.cmsPages.findOne({ _id: candidate }))) return candidate;
	}
	throw new Error(`Could not find an available CMS page id starting from "${base}"`);
}

export const cmsPagePromoter: MigrationPromoter = {
	type: 'cmsPage',
	actionLabel: 'Create CMS page',

	async promote(staged) {
		const normalized = (staged.normalized ?? {}) as NormalizedCmsPage;

		const id = await pickAvailableId(normalized.slug ?? '');
		const now = new Date();
		const rawContent = normalized.content ?? '';
		// Wrap WordPress-imported content under `.wp-imported` so the scoped
		// WP block CSS (built from @wordpress/block-library, see
		// scripts/build-wp-imported-css.mjs) can style it without polluting
		// the rest of the be-BOP page.
		const wrappedContent = rawContent
			? `<div class="wp-imported">\n${rawContent}\n</div>`
			: '';
		const cmsPage: CMSPage = {
			_id: id,
			title: normalized.title ?? id,
			shortDescription: normalized.excerpt ?? '',
			content: wrappedContent,
			fullScreen: false,
			maintenanceDisplay: false,
			createdAt: now,
			updatedAt: now
		};
		await collections.cmsPages.insertOne(cmsPage);

		return {
			promotedAsId: cmsPage._id,
			promotedAsLabel: cmsPage.title
		};
	}
};
