import { collections } from '$lib/server/database';
import type { CMSPage } from '$lib/types/CmsPage';

export async function load({ locals }) {
	return {
		cmsPages: await collections.cmsPages
			.find({})
			.project<Pick<CMSPage, '_id' | 'title' | 'maintenanceDisplay' | 'hasMobileContent'>>({
				_id: 1,
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
				maintenanceDisplay: 1,
				hasMobileContent: 1
			})
			.sort({ updatedAt: -1 })
			.toArray()
	};
}
