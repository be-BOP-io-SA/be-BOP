import { describe, expect, it } from 'vitest';
import { languages, locales } from './index';
import { get } from '../utils/get';

const KEYS = [
	'admin.apiKeys.scopeHint.ordersWrite',
	'admin.apiKeys.scopeHint.catalogRead',
	'admin.apiKeys.scopeHint.ordersRead',
	'product.uniqueKeyLabel',
	'admin.apiKeys.secretStorageNote',
	'admin.apiKeys.environmentHelp',
	'admin.apiKeys.environmentBadgeLive',
	'admin.apiKeys.environmentBadgeTest',
	'admin.apiKeys.corsTitle',
	'admin.apiKeys.corsHelp',
	'admin.apiKeys.corsOriginsLabel',
	'admin.apiKeys.corsOriginsHint',
	'admin.apiKeys.corsSave',
	'admin.apiKeys.corsSaved',
	'admin.apiKeys.listIntro',
	'admin.apiKeys.keysSectionTitle',
	'admin.apiKeys.keysSectionHelp',
	'admin.apiKeys.emptyHint',
	'admin.apiKeys.selectAll',
	'admin.apiKeys.selectNone',
	'admin.apiKeys.scopesHint'
];

describe('admin api-keys scope hint translations', () => {
	it.each(locales)('%s has api-keys scope hint / CORS keys', (locale) => {
		const dict = languages[locale];
		for (const key of KEYS) {
			expect(get(dict, key), `${locale}: ${key}`).toBeTruthy();
		}
	});
});
