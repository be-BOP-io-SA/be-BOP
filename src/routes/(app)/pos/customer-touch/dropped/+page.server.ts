import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';
import { userIdentifier, userQuery } from '$lib/server/user';

export const load = async ({ locals }) => {
	await collections.carts.deleteMany(userQuery(userIdentifier(locals)));

	const cmsDrop = await collections.cmsPages.findOne(
		{ _id: 'touch-drop' },
		{
			projection: {
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] },
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] }
			}
		}
	);

	return {
		...(cmsDrop && {
			cmsDrop,
			cmsDropData: cmsFromContent({ desktopContent: cmsDrop.content }, locals)
		})
	};
};
