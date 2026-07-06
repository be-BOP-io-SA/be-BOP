/**
 * This script checks that all translations have the same parameters as the English translations,
 * and that every `admin.*` key present in English exists in all other locales (issue #878 — the
 * admin i18n migration ships every migrated key in all 7 locales). The coverage check is scoped to
 * `admin.*` on purpose: legacy non-admin namespaces rely on the English runtime fallback and would
 * otherwise fail with thousands of pre-existing gaps.
 */

import fs from 'fs';

const languageMap = {};

fs.readdirSync('src/lib/translations').forEach((file) => {
	if (file.endsWith('.json')) {
		const data = fs.readFileSync(`src/lib/translations/${file}`);
		const translations = JSON.parse(data);
		languageMap[file.split('.')[0]] = translations;
	}
});

const languages = Object.keys(languageMap);

console.log('Available languages:', languages.join(', '));

const flatten = (obj, prefix = '') => {
	const flat = {};

	Object.entries(obj).forEach(([key, value]) => {
		const newKey = prefix ? `${prefix}.${key}` : key;

		if (typeof value === 'object') {
			Object.assign(flat, flatten(value, newKey));
		} else {
			flat[newKey] = value;
		}
	});

	return flat;
};

if (!languages.includes('en')) {
	console.error('Missing English translations');
	process.exit(1);
}

const allowedMismatches = new Set(['es-sv.challenge.numProducts.zero']);

let failed = false;

/**
 * @type {Object.<string, string>}
 */
const enTranslations = flatten(languageMap['en']);
const translationKeysWithParams = Object.keys(enTranslations).filter((key) =>
	enTranslations[key].includes('{')
);

for (const language of languages.filter((l) => l !== 'en')) {
	console.log(`Checking ${language}...`);
	/**
	 * @type {Object.<string, string>}
	 */
	const flatTranslations = flatten(languageMap[language]);

	for (const key of translationKeysWithParams) {
		if (!flatTranslations[key]) {
			continue;
		}

		const enParams = [...new Set(enTranslations[key].match(/{(.*?)}/g)?.sort() ?? [])];
		const params = [...new Set(flatTranslations[key].match(/{(.*?)}/g)?.sort() ?? [])];

		if (enParams.join(',') !== params.join(',') && !allowedMismatches.has(language + '.' + key)) {
			console.error(
				`Mismatched parameters for ${key} in ${language}: ${params.join(', ')} !== ${enParams.join(
					', '
				)}`
			);
			failed = true;
		}
	}
}

// Coverage: every admin.* key present in English must exist in every other locale.
const adminKeys = Object.keys(enTranslations).filter((key) => key.startsWith('admin.'));
for (const language of languages.filter((l) => l !== 'en')) {
	const flatTranslations = flatten(languageMap[language]);
	for (const key of adminKeys) {
		if (flatTranslations[key] === undefined) {
			console.error(`Missing admin.* translation "${key}" in ${language}`);
			failed = true;
		}
	}
}
console.log(
	`Checked admin.* coverage: ${adminKeys.length} keys across ${languages.length} locales.`
);

if (failed) {
	process.exit(1);
}
