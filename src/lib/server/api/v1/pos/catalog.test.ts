import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '$lib/types/Product';

const find = vi.fn();
const tagFind = vi.fn();
const loadCatalogPictures = vi.fn();
const loadCatalogVatRates = vi.fn();

vi.mock('$lib/server/database', () => ({
	collections: {
		products: { find: (...args: unknown[]) => find(...args) },
		tags: { find: (...args: unknown[]) => tagFind(...args) }
	}
}));
vi.mock('../catalog/pictures', () => ({
	loadCatalogPictures: (...args: unknown[]) => loadCatalogPictures(...args)
}));
vi.mock('../catalog/vat', () => ({
	loadCatalogVatRates: (...args: unknown[]) => loadCatalogVatRates(...args)
}));

import { listPosCatalog, toPosCatalogProduct } from './catalog';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

function product(overrides?: Partial<Product>): Product {
	return {
		...TEST_DIGITAL_PRODUCT,
		_id: 'tartiflette',
		name: 'Tartiflette',
		shortDescription: 'Cheese and potatoes',
		price: { amount: 12.5, currency: 'CHF' },
		tagIds: ['cafe'],
		...overrides
	} as Product;
}

/** Mongo cursor stub: find().sort().toArray() */
function cursorOf(docs: unknown[]) {
	return { sort: () => ({ toArray: async () => docs }) };
}

/** Mongo cursor stub: find().sort().project().toArray() */
function projectedCursorOf(docs: unknown[]) {
	return { sort: () => ({ project: () => ({ toArray: async () => docs }) }) };
}

describe('toPosCatalogProduct', () => {
	it('uses the product id as the slug the till sells by', () => {
		expect(toPosCatalogProduct(product(), 'en').slug).toBe('tartiflette');
	});

	it('carries tags, which the seam omits but returnables need', () => {
		expect(toPosCatalogProduct(product(), 'en').tagIds).toEqual(['cafe']);
	});

	it('carries the VAT rate, since the price it does not carry excludes it', () => {
		expect(toPosCatalogProduct(product(), 'en', undefined, 8.1).vatRate).toBe(8.1);
	});

	it('never emits a price — the till holds its own, and sends it back at sale time', () => {
		expect(toPosCatalogProduct(product(), 'en')).not.toHaveProperty('price');
	});

	it('prefers the translated name and description', () => {
		const translated = product({
			translations: { fr: { name: 'Tartiflette FR', shortDescription: 'Fromage' } }
		} as Partial<Product>);
		const dto = toPosCatalogProduct(translated, 'fr');
		expect(dto.name).toBe('Tartiflette FR');
		expect(dto.shortDescription).toBe('Fromage');
	});

	it('carries the picture and all its sizes when there is one, omits the field otherwise', () => {
		const base = 'https://shop.example/api/v1/catalog/products/tartiflette/picture';
		const picture = {
			url: base,
			width: 128,
			height: 96,
			formats: [
				{ url: `${base}?width=128`, width: 128, height: 96 },
				{ url: `${base}?width=512`, width: 512, height: 384 }
			]
		};
		expect(toPosCatalogProduct(product(), 'en', picture).picture).toEqual(picture);
		expect(toPosCatalogProduct(product(), 'en').picture).toBeUndefined();
	});

	it('never emits returnable — tags are the single source of truth for returnables', () => {
		expect(toPosCatalogProduct(product(), 'en')).not.toHaveProperty('returnable');
	});
});

describe('listPosCatalog', () => {
	beforeEach(() => {
		find.mockReset();
		find.mockReturnValue(cursorOf([product()]));
		tagFind.mockReset();
		tagFind.mockReturnValue(projectedCursorOf([{ _id: 'cafe', name: 'Café' }]));
		loadCatalogPictures.mockReset();
		loadCatalogPictures.mockResolvedValue(new Map());
		loadCatalogVatRates.mockReset();
		loadCatalogVatRates.mockResolvedValue(new Map([['tartiflette', 8.1]]));
	});

	it('returns the whole catalog, unpaginated', async () => {
		find.mockReturnValue(cursorOf([product(), product({ _id: 'banane' })]));
		expect((await listPosCatalog('en')).products).toHaveLength(2);
	});

	it('restricts itself to what the catalog would show', async () => {
		await listPosCatalog('en');
		expect(find.mock.calls[0][0]).toEqual({
			$or: [{ 'actionSettings.eShop.visible': true }, { 'actionSettings.retail.visible': true }]
		});
	});

	it('asks for pictures of exactly the products it returns', async () => {
		await listPosCatalog('en');
		expect(loadCatalogPictures).toHaveBeenCalledWith(['tartiflette'], undefined);
	});

	it('attaches the resolved VAT rate to its own product', async () => {
		loadCatalogVatRates.mockResolvedValue(new Map([['tartiflette', 20]]));
		const { products } = await listPosCatalog('en');
		expect(products[0].vatRate).toBe(20);
	});

	it('attaches each picture to its own product', async () => {
		const base = 'https://shop.example/api/v1/catalog/products/tartiflette/picture';
		const picture = {
			url: base,
			width: 128,
			height: 96,
			formats: [{ url: `${base}?width=128`, width: 128, height: 96 }]
		};
		loadCatalogPictures.mockResolvedValue(new Map([['tartiflette', picture]]));
		const { products } = await listPosCatalog('en');
		expect(products[0].picture).toEqual(picture);
	});

	it('resolves the tags its products reference, so a till can label them', async () => {
		tagFind.mockReturnValue(projectedCursorOf([{ _id: 'cafe', name: 'Café', family: 'boissons' }]));
		const { tags } = await listPosCatalog('en');
		expect(tags).toEqual([{ id: 'cafe', name: 'Café', family: 'boissons' }]);
	});

	it('asks only for the tags the catalog actually uses', async () => {
		find.mockReturnValue(
			cursorOf([product({ tagIds: ['cafe', 'vert'] }), product({ _id: 'b', tagIds: ['cafe'] })])
		);
		await listPosCatalog('en');
		expect(tagFind.mock.calls[0][0]).toEqual({ _id: { $in: ['cafe', 'vert'] } });
	});

	it('skips the tag query entirely when nothing is tagged', async () => {
		find.mockReturnValue(cursorOf([product({ tagIds: [] })]));
		const { tags } = await listPosCatalog('en');
		expect(tags).toEqual([]);
		expect(tagFind).not.toHaveBeenCalled();
	});

	it('falls back to the tag id when a tag carries no name', async () => {
		tagFind.mockReturnValue(projectedCursorOf([{ _id: 'cafe' }]));
		const { tags } = await listPosCatalog('en');
		expect(tags).toEqual([{ id: 'cafe', name: 'cafe' }]);
	});
});
