import en from './en.json';
import es_sv from './es-sv.json';
import fr from './fr.json';
import nl from './nl.json';
import it from './it.json';
import pt from './pt.json';

// @ts-expect-error need to upgrade sveltekit and tsconfig's moduleResolution
import { formatDistance as formatDistanceEn } from 'date-fns/formatDistance/en-US';
// @ts-expect-error need to upgrade sveltekit and tsconfig's moduleResolution
import { formatDistance as formatDistanceFr } from 'date-fns/formatDistance/fr';
// @ts-expect-error need to upgrade sveltekit and tsconfig's moduleResolution
import { formatDistance as formatDistanceIt } from 'date-fns/formatDistance/it';
// @ts-expect-error need to upgrade sveltekit and tsconfig's moduleResolution
import { formatDistance as formatDistanceNl } from 'date-fns/formatDistance/nl';
// @ts-expect-error need to upgrade sveltekit and tsconfig's moduleResolution
import { formatDistance as formatDistanceEs } from 'date-fns/formatDistance/es';
// @ts-expect-error need to upgrade sveltekit and tsconfig's moduleResolution
import { formatDistance as formatDistancePt } from 'date-fns/formatDistance/pt';

import { typedKeys } from '$lib/utils/typedKeys';
import type { FormatDistanceFn } from 'date-fns';
import { merge } from '$lib/utils/merge';

export const languages = {
	en,
	'es-sv': es_sv,
	fr,
	nl,
	it,
	pt
};

export const formatDistanceLocale = {
	en: formatDistanceEn as FormatDistanceFn,
	'es-sv': formatDistanceEs as FormatDistanceFn,
	fr: formatDistanceFr as FormatDistanceFn,
	nl: formatDistanceNl as FormatDistanceFn,
	it: formatDistanceIt as FormatDistanceFn,
	pt: formatDistancePt as FormatDistanceFn
};

/**
 * Contains dynamic translations loaded from DB.
 */
export const enhancedLanguages = merge({}, languages);

export const locales = typedKeys(languages);

export type LanguageKey = keyof typeof languages;

export const languageNames: Record<LanguageKey, string> = {
	en: 'English',
	'es-sv': 'Español (El Salvador)',
	fr: 'Français',
	nl: 'Nederlands',
	it: 'Italian',
	pt: 'Portuguese'
};
