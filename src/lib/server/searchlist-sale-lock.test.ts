import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from './database';
import { readUrlState, searchProducts } from './searchlist';
import { TEST_DIGITAL_PRODUCT } from './seed/product';
import { cleanDb } from './test-utils';
import { DEFAULT_SEARCH_TARGETS, type Searchlist } from '$lib/types/Searchlist';

const SEARCHLIST: Searchlist = {
	_id: 'test',
	name: 'Test',
	displayWidgetName: false,
	hideSearchbar: false,
	prefillSearchterm: false,
	initialSearchterm: '',
	hideSearchterm: false,
	searchTargets: { ...DEFAULT_SEARCH_TARGETS },
	filters: {
		price: { enabled: false, defaultMin: undefined, defaultMax: undefined },
		stock: { enabled: false, defaultChecked: false },
		tags: { enabled: false, allowedTagIds: [] }
	},
	sort: { displayed: true, options: ['createdDesc'], default: 'createdDesc' },
	view: { default: 'grid', hideToggle: false },
	pagination: { mode: 'classic', perPage: 20 },
	createdAt: new Date(),
	updatedAt: new Date()
};

// #2143: every page that lists search results — the search list page and the CMS widgets alike —
// gets its products from here, so this is where the list of authorised customers must be dropped.
describe('searchProducts and sale locks', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne({
			...TEST_DIGITAL_PRODUCT,
			whitelist: {
				emails: ['alice@example.com'],
				npubs: [],
				subscriptionProductIds: [],
				allowEmployees: false
			}
		});
	});

	it('never returns the list of authorised customers, and flags the product as locked', async () => {
		const { products } = await searchProducts(
			SEARCHLIST,
			readUrlState(new URL('https://shop.test/searchlist/test'), SEARCHLIST),
			{ language: 'en', sessionId: 'visitor-session' } as App.Locals,
			{
				vatProfiles: [],
				bebopCountry: 'FR',
				userCountry: 'FR',
				vatSingleCountry: false,
				displayVatIncluded: false
			}
		);

		expect(products).toHaveLength(1);
		expect(products[0]).not.toHaveProperty('whitelist');
		expect(JSON.stringify(products)).not.toContain('alice@example.com');
		expect(products[0].saleLocked).toBe(true);
	});
});
