import { useI18n } from '$lib/i18n';
import { locales, type LanguageKey } from '$lib/translations';
import type { CMSPageTranslatableFields } from '$lib/types/CmsPage';

export const DEFAULT_CMS_PAGES = [
	'home',
	'terms',
	'privacy',
	'why-vat-customs',
	'why-collect-ip',
	'why-pay-remainder',
	'maintenance',
	'error',
	'order-top',
	'order-bottom',
	'checkout-top',
	'checkout-bottom',
	'cart-top',
	'cart-bottom',
	'agewall'
] as const;

export type DefaultCmsPageSlug = (typeof DEFAULT_CMS_PAGES)[number];

export const PAGES_WITHOUT_DEFAULT_TEXT = new Set<DefaultCmsPageSlug>([
	'order-top',
	'order-bottom',
	'checkout-top',
	'checkout-bottom',
	'cart-top',
	'cart-bottom'
]);

const TITLE_KEY: Record<DefaultCmsPageSlug, string> = {
	home: 'cms.defaultPage.title.home',
	terms: 'cms.defaultPage.title.terms',
	privacy: 'cms.defaultPage.title.privacy',
	'why-vat-customs': 'cms.defaultPage.title.whyVatCustoms',
	'why-collect-ip': 'cms.defaultPage.title.whyCollectIp',
	'why-pay-remainder': 'cms.defaultPage.title.whyPayRemainder',
	maintenance: 'cms.defaultPage.title.maintenance',
	error: 'cms.defaultPage.title.error',
	'order-top': 'cms.defaultPage.title.orderTop',
	'order-bottom': 'cms.defaultPage.title.orderBottom',
	'checkout-top': 'cms.defaultPage.title.checkoutTop',
	'checkout-bottom': 'cms.defaultPage.title.checkoutBottom',
	'cart-top': 'cms.defaultPage.title.cartTop',
	'cart-bottom': 'cms.defaultPage.title.cartBottom',
	agewall: 'cms.defaultPage.title.agewall'
};

function defaultTitle(slug: DefaultCmsPageSlug): string {
	return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
}

function defaultContent(slug: DefaultCmsPageSlug): string {
	return PAGES_WITHOUT_DEFAULT_TEXT.has(slug)
		? ''
		: '<p>This page is empty. Please edit it to add your content.</p>';
}

/**
 * Builds the base (English) fields plus a `translations` map for every other locale, so
 * default CMS pages ship pre-translated instead of only falling back to English (issue #878).
 */
export function buildDefaultCmsPageFields(slug: DefaultCmsPageSlug): {
	title: string;
	content: string;
	translations: Partial<Record<LanguageKey, Partial<CMSPageTranslatableFields>>>;
} {
	const translations: Partial<Record<LanguageKey, Partial<CMSPageTranslatableFields>>> = {};

	for (const locale of locales) {
		if (locale === 'en') {
			continue;
		}
		const { t } = useI18n(locale);
		translations[locale] = {
			title: t(TITLE_KEY[slug]),
			content: PAGES_WITHOUT_DEFAULT_TEXT.has(slug) ? '' : t('cms.defaultPage.emptyContent')
		};
	}

	return {
		title: defaultTitle(slug),
		content: defaultContent(slug),
		translations
	};
}

/** True if the page's current en content still matches the untouched default (safe to backfill translations). */
export function isUntouchedDefaultCmsPage(
	slug: DefaultCmsPageSlug,
	page: { title: string; content: string }
): boolean {
	return (
		page.title === defaultTitle(slug) &&
		(page.content === defaultContent(slug) || page.content === '')
	);
}
