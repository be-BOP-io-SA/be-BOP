import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';

export const load = async ({ locals }) => {
	const welcomeCmsSlug = runtimeConfig.customerTouchInterface?.welcomeCmsSlug;

	if (!welcomeCmsSlug) {
		return {};
	}

	const cmsWelcome = await collections.cmsPages.findOne(
		{ _id: welcomeCmsSlug },
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] }
			}
		}
	);

	return {
		...(cmsWelcome && {
			cmsWelcome,
			cmsWelcomeData: cmsFromContent({ desktopContent: cmsWelcome.content }, locals)
		})
	};
};
