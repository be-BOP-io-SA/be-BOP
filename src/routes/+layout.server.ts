import { runtimeConfig, runtimeConfigUpdatedAt } from '$lib/server/runtime-config';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { getCookieConsent } from '$lib/server/cookies';
import { extractAnalyticsHostnames } from '$lib/server/analytics-hostnames';
import { collections } from '$lib/server/database';

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

	const analyticsSnippet = runtimeConfig.analyticsScriptSnippet;
	const analyticsConsent = getCookieConsent(event.cookies);
	const analyticsSnippetConfigured = !!analyticsSnippet;
	const analyticsHostnames = analyticsSnippetConfigured
		? extractAnalyticsHostnames(analyticsSnippet)
		: [];
	const hasPrivacyPage = analyticsSnippetConfigured
		? !!(await collections.cmsPages.findOne({ _id: 'privacy' }, { projection: { _id: 1 } }))
		: false;

	return {
		// Only emit the raw snippet when the visitor has accepted — this is what the root layout
		// renders into <head>, so deny / no-choice means no script is even fetched.
		analyticsScriptSnippet: analyticsConsent === 'accepted' ? analyticsSnippet : '',
		analyticsSnippetConfigured,
		analyticsConsent,
		analyticsHostnames,
		analyticsHasPrivacyPage: hasPrivacyPage,
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
		contactModesForceOption: runtimeConfig.contactModesForceOption,
		hideFromSearchEngines: runtimeConfig.hideFromSearchEngines,
		ageRestriction: runtimeConfig.ageRestriction,
		bolt12Address: runtimeConfig.phoenixd.bolt12Address
	};
}
