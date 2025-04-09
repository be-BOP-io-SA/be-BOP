import { merge } from 'lodash-es';
import en from './en.json';
import es_sv from './es-sv.json';
import fr from './fr.json';
import nl from './nl.json';
import it from './it.json';

import { formatDistance as formatDistanceEn } from 'date-fns/formatDistance/en-US';
import { formatDistance as formatDistanceFr } from 'date-fns/formatDistance/fr';
import { formatDistance as formatDistanceIt } from 'date-fns/formatDistance/it';
import { formatDistance as formatDistanceNl } from 'date-fns/formatDistance/nl';
import { formatDistance as formatDistanceEs } from 'date-fns/formatDistance/es';

import { typedKeys } from '$lib/utils/typedKeys';

export const languages = {
	en,
	'es-sv': es_sv,
	fr,
	nl,
	it
};

export const formatDistanceLocale = {
	en: formatDistanceEn,
	'es-sv': formatDistanceEs,
	fr: formatDistanceFr,
	nl: formatDistanceNl,
	it: formatDistanceIt
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
	it: 'Italian'
};
