import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runtimeConfig } from './runtime-config';
import {
	buildSearchOrClauses,
	extractTagsFromTerm,
	mainPerCurrency,
	readUrlState
} from './searchlist';
import { DEFAULT_SEARCH_TARGETS, type Searchlist } from '$lib/types/Searchlist';

function makeSearchlist(overrides: Partial<Searchlist> = {}): Searchlist {
	return {
		_id: 'test',
		name: 'Test',
		displayWidgetName: false,
		hideSearchbar: false,
		prefillSearchterm: false,
		initialSearchterm: '',
		hideSearchterm: false,
		searchTargets: { ...DEFAULT_SEARCH_TARGETS },
		filters: {
			price: { enabled: true, defaultMin: undefined, defaultMax: undefined },
			stock: { enabled: true, defaultChecked: false },
			tags: { enabled: true, allowedTagIds: [] }
		},
		sort: { displayed: true, options: ['createdDesc'], default: 'createdDesc' },
		view: { default: 'grid', hideToggle: false },
		pagination: { mode: 'classic', perPage: 20 },
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

describe('extractTagsFromTerm', () => {
	it('returns the term untouched when no tag: prefix is present', () => {
		expect(extractTagsFromTerm('red shoes')).toEqual({ tagIds: [], remaining: 'red shoes' });
	});

	it('extracts a single tag and trims the remaining term', () => {
		expect(extractTagsFromTerm('tag:sale red shoes')).toEqual({
			tagIds: ['sale'],
			remaining: 'red shoes'
		});
	});

	it('extracts multiple tags from the same query', () => {
		const result = extractTagsFromTerm('tag:sale red tag:winter shoes');
		expect(result.tagIds).toEqual(['sale', 'winter']);
		expect(result.remaining).toBe('red shoes');
	});

	it('is case-insensitive on the tag: prefix', () => {
		expect(extractTagsFromTerm('TAG:promo deal')).toEqual({
			tagIds: ['promo'],
			remaining: 'deal'
		});
	});

	it('returns an empty remaining when only tags are provided', () => {
		expect(extractTagsFromTerm('tag:sale tag:winter')).toEqual({
			tagIds: ['sale', 'winter'],
			remaining: ''
		});
	});
});

describe('readUrlState', () => {
	const searchlist = makeSearchlist();

	it('falls back to defaults when query params are missing', () => {
		const state = readUrlState(new URL('https://shop.test/searchlist/x'), searchlist);
		expect(state).toMatchObject({
			q: '',
			sort: 'createdDesc',
			view: 'grid',
			page: 1,
			stock: false
		});
	});

	it('clamps page to 1 when the param is invalid', () => {
		const state = readUrlState(new URL('https://shop.test/searchlist/x?page=-3'), searchlist);
		expect(state.page).toBe(1);
	});

	it('ignores invalid sort/view and keeps the searchlist defaults', () => {
		const state = readUrlState(
			new URL('https://shop.test/searchlist/x?sort=nope&view=bogus'),
			searchlist
		);
		expect(state.sort).toBe('createdDesc');
		expect(state.view).toBe('grid');
	});

	it('uses initialSearchterm only when prefillSearchterm is on', () => {
		const sl = makeSearchlist({ prefillSearchterm: true, initialSearchterm: 'hello' });
		expect(readUrlState(new URL('https://shop.test/searchlist/x'), sl).q).toBe('hello');
		const slOff = makeSearchlist({ prefillSearchterm: false, initialSearchterm: 'hello' });
		expect(readUrlState(new URL('https://shop.test/searchlist/x'), slOff).q).toBe('');
	});

	it('parses pmin/pmax, ignoring non-numeric values', () => {
		const state = readUrlState(
			new URL('https://shop.test/searchlist/x?pmin=10&pmax=foo'),
			searchlist
		);
		expect(state.pmin).toBe(10);
		expect(state.pmax).toBeUndefined();
	});
});

describe('buildSearchOrClauses', () => {
	it('escapes regex special characters in the term', () => {
		const clauses = buildSearchOrClauses(
			'a+b.c*',
			{ ...DEFAULT_SEARCH_TARGETS, title: true },
			'en'
		);
		const fieldClause = clauses.find((c) => 'name' in c) as { name: { $regex: string } };
		expect(fieldClause.name.$regex).toBe('a\\+b\\.c\\*');
	});

	it('emits a clause for the translated field next to the canonical one', () => {
		const clauses = buildSearchOrClauses('shoes', { ...DEFAULT_SEARCH_TARGETS, title: true }, 'fr');
		expect(clauses.some((c) => 'name' in c)).toBe(true);
		expect(clauses.some((c) => 'translations.fr.name' in c)).toBe(true);
	});

	it('returns no clauses when every target is disabled', () => {
		const allOff = Object.fromEntries(
			Object.keys(DEFAULT_SEARCH_TARGETS).map((k) => [k, false])
		) as typeof DEFAULT_SEARCH_TARGETS;
		expect(buildSearchOrClauses('anything', allOff, 'en')).toEqual([]);
	});
});

describe('mainPerCurrency', () => {
	const savedRates = { ...runtimeConfig.exchangeRate };

	beforeAll(() => {
		runtimeConfig.exchangeRate.EUR = 50_000; // 1 BTC = 50k EUR
		runtimeConfig.exchangeRate.USD = 60_000; // 1 BTC = 60k USD
	});

	afterAll(() => {
		Object.assign(runtimeConfig.exchangeRate, savedRates);
	});

	it('returns 1 when from === main', () => {
		expect(mainPerCurrency('EUR', 'EUR')).toBe(1);
		expect(mainPerCurrency('BTC', 'BTC')).toBe(1);
	});

	it('converts via BTC pivot when both rates are present', () => {
		// 1 EUR = (60000 / 50000) USD = 1.2 (mainRate / fromRate)
		expect(mainPerCurrency('EUR', 'USD')).toBeCloseTo(60_000 / 50_000, 6);
	});

	it('falls back to 1 when a rate is missing', () => {
		delete runtimeConfig.exchangeRate.EUR;
		expect(mainPerCurrency('EUR', 'USD')).toBe(1);
		runtimeConfig.exchangeRate.EUR = 50_000;
	});
});
