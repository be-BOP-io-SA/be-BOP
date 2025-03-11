import { runtimeConfig, runtimeConfigUpdatedAt } from '$lib/server/runtime-config';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';

export async function load(event) {
	const viewportWidth = (() => {
		switch (runtimeConfig.viewportFor) {
			case 'everyone':
				return 'width=device-width';
			case 'employee':
				return event.locals.user?.roleId !== undefined &&
					event.locals.user?.roleId !== CUSTOMER_ROLE_ID
					? 'width=device-width'
					: `width=${runtimeConfig.viewportContentWidth}`;
			case 'visitors':
				return event.locals.user?.roleId === undefined ||
					event.locals.user?.roleId === CUSTOMER_ROLE_ID
					? 'width=device-width'
					: `width=${runtimeConfig.viewportContentWidth}`;
			default:
				return `width=${runtimeConfig.viewportContentWidth}`;
		}
	})();

	return {
		plausibleScriptUrl: runtimeConfig.plausibleScriptUrl,
		language: event.locals.language,
		themeChangeNumber: runtimeConfig.themeChangeNumber,
		enUpdatedAt: runtimeConfigUpdatedAt[`translations.en`] ?? new Date(0),
		faviconPictureId: runtimeConfig.faviconPictureId,
		languageUpdatedAt:
			runtimeConfigUpdatedAt[`translations.${event.locals.language}`] ?? new Date(0),
		websiteTitle:
			runtimeConfig[`translations.${event.locals.language}.config`]?.websiteTitle ||
			runtimeConfig.websiteTitle,
		websiteShortDescription:
			runtimeConfig[`translations.${event.locals.language}.config`]?.websiteShortDescription ||
			runtimeConfig.websiteShortDescription,
		viewportWidth,
		contactModes: runtimeConfig.contactModes,
		hideFromSearchEngines: runtimeConfig.hideFromSearchEngines,
		ageRestriction: runtimeConfig.ageRestriction,
		bolt12Address: runtimeConfig.phoenixd.bolt12Address
	};
}
