import { describe, expect, it } from 'vitest';
import { languages, locales } from './index';
import { get } from '../utils/get';

const KEYS = [
	'admin.apiKeys.scopeHint.ordersWrite',
	'admin.apiKeys.scopeHint.catalogRead',
	'admin.apiKeys.scopeHint.ordersRead',
	'admin.apiKeys.secretStorageNote',
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
	'admin.apiKeys.scopesHint',
	'admin.apiKeys.logTitle',
	'admin.apiKeys.logHelp',
	'admin.apiKeys.logFilterKey',
	'admin.apiKeys.logFilterAllKeys',
	'admin.apiKeys.logFilterOutcome',
	'admin.apiKeys.logOutcomeAll',
	'admin.apiKeys.logOutcomeErrors',
	'admin.apiKeys.logFilterApply',
	'admin.apiKeys.logEmpty',
	'admin.apiKeys.logWhen',
	'admin.apiKeys.logKey',
	'admin.apiKeys.logCall',
	'admin.apiKeys.logStatus',
	'admin.apiKeys.logDuration',
	'admin.apiKeys.logNoKey',
	'admin.apiKeys.logDetails',
	'admin.apiKeys.logStream',
	'admin.apiKeys.logRequest',
	'admin.apiKeys.logResponse',
	'admin.apiKeys.logTruncated',
	'admin.apiKeys.logCount',
	'admin.apiKeys.logPrevious',
	'admin.apiKeys.logNext',
	'admin.apiKeys.streamsTitle',
	'admin.apiKeys.streamsHelp',
	'admin.apiKeys.maxConcurrentStreams',
	'admin.apiKeys.maxConcurrentStreamsHint',
	'admin.apiKeys.openStreamsNow',
	'admin.apiKeys.streamLifetimeSeconds',
	'admin.apiKeys.streamLifetimeSecondsHint',
	'admin.apiKeys.streamsSave',
	'admin.apiKeys.streamsSaved',
	'admin.apiKeys.streamsResetDone'
];

describe('admin api-keys scope hint translations', () => {
	it.each(locales)('%s has api-keys scope hint / CORS keys', (locale) => {
		const dict = languages[locale];
		for (const key of KEYS) {
			expect(get(dict, key), `${locale}: ${key}`).toBeTruthy();
		}
	});
});
