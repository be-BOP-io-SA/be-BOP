import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';

export const load = async ({ locals }) => {
	const cmsDropConfirm = await collections.cmsPages.findOne(
		{ _id: 'touch-drop-confirm' },
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] }
			}
		}
	);

	return {
		...(cmsDropConfirm && {
			cmsDropConfirm,
			cmsDropConfirmData: cmsFromContent({ desktopContent: cmsDropConfirm.content }, locals)
		})
	};
};
