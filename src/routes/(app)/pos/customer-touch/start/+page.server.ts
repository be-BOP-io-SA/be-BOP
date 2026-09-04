import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';

export const load = async ({ locals }) => {
	const cmsIntro2 = await collections.cmsPages.findOne(
		{ _id: 'touch-intro-2' },
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] }
			}
		}
	);

	return {
		...(cmsIntro2 && {
			cmsIntro2,
			cmsIntro2Data: cmsFromContent({ desktopContent: cmsIntro2.content }, locals)
		})
	};
};
