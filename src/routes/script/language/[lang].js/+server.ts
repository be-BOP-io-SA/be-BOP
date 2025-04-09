import { runtimeConfigUpdatedAt } from '$lib/server/runtime-config.js';
import { enhancedLanguages, LanguageKey, locales } from '$lib/translations';
import { typedInclude } from '$lib/utils/typedIncludes.js';
import formatDistanceFr from 'date-fns/formatDistance/fr?raw';
import formatDistanceEn from 'date-fns/formatDistance/en-US?raw';
import formatDistanceIt from 'date-fns/formatDistance/it?raw';
import formatDistanceNl from 'date-fns/formatDistance/nl?raw';
import formatDistanceEs from 'date-fns/formatDistance/es?raw';

const cache: Record<string, string> = {};
const cachedAt: Record<string, number> = {};

const formatDistanceRawFiles: Record<LanguageKey, string> = {
	fr: formatDistanceFr,
	en: formatDistanceEn,
	it: formatDistanceIt,
	nl: formatDistanceNl,
	'es-sv': formatDistanceEs
};

export const GET = async ({ params }) => {
	if (!typedInclude(locales, params.lang)) {
		return new Response('Not found', { status: 404 });
	}

	const cacheTime = cachedAt[params.lang] ?? new Date(0).getTime();
	const updatedAtTime = (
		runtimeConfigUpdatedAt[`translations.${params.lang}`] ?? new Date(0)
	).getTime();

	let responseText = cacheTime === updatedAtTime ? cache[params.lang] : undefined;

	if (!responseText) {
		const messages = enhancedLanguages[params.lang];
		responseText = `window.language = window.language || {}; window.language['${
			params.lang
		}'] = ${JSON.stringify(messages)};
		window.languageFns = window.languageFns || {}; window.languageFns['${
			params.lang
		}'] = {formatDistance: (() => { ${formatDistanceRawFiles[params.lang].replace(
			'export const formatDistance =',
			'return'
		)} })()};`;
		cache[params.lang] = responseText;
		cachedAt[params.lang] = updatedAtTime;
	}

	return new Response(responseText, {
		headers: {
			'Content-Type': 'application/javascript; charset=utf-8',
			...(import.meta.env.DEV
				? {}
				: {
						'Cache-Control': 'public, max-age=31536000, immutable'
				  })
		}
	});
};
