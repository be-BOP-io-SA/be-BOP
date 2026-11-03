import { languages, type LanguageKey } from '$lib/translations';

/**
 * Resolve a translation key server-side, for content that is *seeded into the database*
 * rather than rendered through t(): default CMS pages, the default PoS payment subtype…
 *
 * Such values become shop data the admin can edit afterwards, so they must be written in
 * the shop's language once, at creation time — a t() call at render time would overwrite
 * whatever the shop renamed them to.
 *
 * Falls back to English when the key is missing from the target locale.
 */
export function defaultLanguageText(language: LanguageKey, path: string): string {
	return lookup(language, path) ?? lookup('en', path) ?? path;
}

function lookup(language: LanguageKey, path: string): string | undefined {
	let node: unknown = languages[language];
	for (const segment of path.split('.')) {
		if (typeof node !== 'object' || node === null || !(segment in node)) {
			return undefined;
		}
		node = (node as Record<string, unknown>)[segment];
	}
	return typeof node === 'string' ? node : undefined;
}
