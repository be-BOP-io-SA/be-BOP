import { beforeEach, describe, expect, it } from 'vitest';
import { enUS } from 'date-fns/locale';
import { addTranslations, useI18n } from './i18n';

const fns = { formatDistance: enUS.formatDistance };
const label = {
	key: 'admin.fixture.apiKey',
	text: { en: 'API Key', fr: 'Clé API' }
};

describe('tInline', () => {
	beforeEach(() => {
		addTranslations('en', {}, fns);
		addTranslations('fr', {}, fns);
		addTranslations('de', {}, fns);
	});

	it('shows the text written for the language', () => {
		expect(useI18n('fr').tInline(label)).toBe('Clé API');
	});

	it('falls back on English for a language the text was not written in', () => {
		expect(useI18n('de').tInline(label)).toBe('API Key');
	});

	it('prefers what the shop stored under the key in that language', () => {
		addTranslations('fr', { admin: { fixture: { apiKey: 'Clé secrète' } } }, fns);

		expect(useI18n('fr').tInline(label)).toBe('Clé secrète');
		expect(useI18n('en').tInline(label)).toBe('API Key');
	});

	it('keeps the written text of a language over what the shop stored in English', () => {
		addTranslations('en', { admin: { fixture: { apiKey: 'Token' } } }, fns);

		expect(useI18n('fr').tInline(label)).toBe('Clé API');
		expect(useI18n('de').tInline(label)).toBe('Token');
	});

	it('needs no key', () => {
		expect(useI18n('fr').tInline({ text: label.text })).toBe('Clé API');
	});
});
