import { browser } from '$app/environment';
import { get } from 'lodash-es';
import { getContext } from 'svelte';
import { writable, get as storeGet } from 'svelte/store';
import { COUNTRY_ALPHA2S, type CountryAlpha2 } from './types/Country';
import type { OrderAddress } from './types/Order';
import { FormatDistanceFn } from 'date-fns';

export interface LocaleDictionary {
	[key: string]: LocaleDictionary | string;
}
export type LocalesDictionary = {
	[key: string]: LocaleDictionary;
};

const locale = writable<string>('en');

const data: LocalesDictionary = {};
const functions: Record<string, { formatDistance: FormatDistanceFn }> = {};

let languagesLoaded = false;

export function useI18n(language?: string) {
	language ||= getContext<string>('language');

	locale.set(language);

	if (browser) {
		if (!languagesLoaded) {
			const languages = 'language' in window ? (window.language as LocalesDictionary) : {};
			const languageFns =
				'languageFns' in window
					? (window.languageFns as Record<string, { formatDistance: FormatDistanceFn }>)
					: {};
			for (const entry of Object.entries(languages)) {
				addTranslations(entry[0], entry[1], {
					formatDistance: languageFns[entry[0]]?.formatDistance
				});
			}
			languagesLoaded = true;
		}
	} else {
		// loaded in hooks.server.ts
	}

	return {
		t,
		locale,
		countryName,
		te,
		sortedCountryCodes,
		textAddress,
		formatDistanceLocale: () => ({
			formatDistance: functions[storeGet(locale)].formatDistance
		})
	};
}

function textAddress(address: OrderAddress) {
	return `${address.firstName || ''} ${address.lastName || ''}\n${address.address || ''}\n${
		address.zip || ''
	} ${address.city || ''}\n${address.state || ''}${address.state && address.country ? ',' : ''} ${
		address.country ? countryName(address.country) : ''
	}\n${address.companyName || ''}\n${address.vatNumber || ''}\n${address.phone || ''}`
		.trim()
		.replace(/\n+/g, '\n')
		.replace(/ +/g, ' ');
}

function countryName(alpha2: string) {
	const key = `country.alpha2.${alpha2}`;
	if (!te(key)) {
		return alpha2;
	}
	return t(key);
}

const sortedCountryCodesCache = new Map<string, CountryAlpha2[]>();

function sortedCountryCodes() {
	const ret =
		sortedCountryCodesCache.get(storeGet(locale)) ??
		[...COUNTRY_ALPHA2S].sort((a, b) =>
			countryName(a).localeCompare(countryName(b), storeGet(locale), { sensitivity: 'base' })
		);

	sortedCountryCodesCache.set(storeGet(locale), ret);

	return ret;
}

function te(key: string): boolean {
	return !!get(data[storeGet(locale)], key) || !!get(data.en, key);
}

function t(key: string, params?: Record<string, string | number | undefined>) {
	let translation = get(data[storeGet(locale)], key) ?? get(data.en, key);

	if (typeof translation !== 'string') {
		if (params?.count !== undefined) {
			translation = translation[params.count === 1 ? 'one' : params.count === 0 ? 'zero' : 'other'];
		}
	}

	if (typeof translation !== 'string') {
		return key;
	}

	return translation.replaceAll(/{(\w+)}/g, (_, key) => String(params?.[key] ?? `{${key}}`));
}

export function addTranslations(
	locale: string,
	translations: LocaleDictionary,
	fns: { formatDistance: FormatDistanceFn }
) {
	data[locale] = translations;
	functions[locale] = fns;
}
