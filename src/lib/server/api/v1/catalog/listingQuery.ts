import { locales } from '$lib/translations';
import { limitParam, oneOfParam, textParam } from '../query';

/** Largest page the catalogue listing returns. */
export const CATALOG_LISTING_MAX_LIMIT = 100;

export const CATALOG_PRODUCT_TYPES = ['subscription', 'resource', 'donation'] as const;

/** `lang`: one of the shop's languages. */
export const catalogLanguageParam = oneOfParam(locales);

/** The query parameters the catalogue listing takes, besides the picture options. */
export const CATALOG_LISTING_QUERY = {
	type: oneOfParam(CATALOG_PRODUCT_TYPES),
	tags: textParam,
	limit: limitParam(CATALOG_LISTING_MAX_LIMIT),
	cursor: textParam,
	lang: catalogLanguageParam
};
