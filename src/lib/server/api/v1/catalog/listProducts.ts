import { collections } from '$lib/server/database';
import { locales, type LanguageKey } from '$lib/translations';
import type { Product } from '$lib/types/Product';
import { toCatalogProductDto, type CatalogProductDto } from './dto';
import { loadCatalogPictures } from './pictures';
import { catalogVisibilityFilter } from '$lib/server/product-visibility';
import { loadCatalogVatRates } from './vat';
import type { PictureOptions } from './pictureOptions';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const PRODUCT_TYPES = ['subscription', 'resource', 'donation'] as const;

export type CatalogListQuery = {
	type?: string;
	tags?: string;
	limit?: string;
	cursor?: string;
	lang?: string;
	picture?: PictureOptions;
};

export type CatalogListResult = {
	products: CatalogProductDto[];
	page: { limit: number; nextCursor: string | null };
	language: LanguageKey;
};

function parseLimit(raw: string | undefined): number {
	const n = raw ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
	if (!Number.isFinite(n) || n < 1) {
		return DEFAULT_LIMIT;
	}
	return Math.min(n, MAX_LIMIT);
}

export function parseCatalogLanguage(raw: string | undefined, fallback: LanguageKey): LanguageKey {
	if (raw && (locales as readonly string[]).includes(raw)) {
		return raw as LanguageKey;
	}
	return fallback;
}

export async function listCatalogProducts(
	query: CatalogListQuery,
	fallbackLanguage: LanguageKey
): Promise<CatalogListResult> {
	const language = parseCatalogLanguage(query.lang, fallbackLanguage);
	const limit = parseLimit(query.limit);
	const filter: Record<string, unknown> = { ...catalogVisibilityFilter() };

	if (query.type && (PRODUCT_TYPES as readonly string[]).includes(query.type)) {
		filter.type = query.type;
	}

	if (query.tags) {
		const tags = query.tags
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)
			.slice(0, 50);
		if (tags.length) {
			filter.tagIds = { $in: tags };
		}
	}

	if (query.cursor) {
		filter._id = { $gt: query.cursor };
	}

	const docs = await collections.products
		.find(filter)
		.sort({ _id: 1 })
		.limit(limit + 1)
		.toArray();

	const hasMore = docs.length > limit;
	const pageDocs = hasMore ? docs.slice(0, limit) : docs;
	const pictures = await loadCatalogPictures(
		pageDocs.map((p) => p._id),
		query.picture
	);
	const vatRates = await loadCatalogVatRates(pageDocs as Product[]);
	const products = pageDocs.map((p) =>
		toCatalogProductDto(p as Product, language, pictures.get(p._id), vatRates.get(p._id))
	);
	const nextCursor = hasMore ? pageDocs[pageDocs.length - 1]._id : null;

	return { products, page: { limit, nextCursor }, language };
}

export async function getCatalogProduct(
	id: string,
	language: LanguageKey,
	picture?: PictureOptions
): Promise<CatalogProductDto | null> {
	const product = await collections.products.findOne({
		$and: [catalogVisibilityFilter(), { $or: [{ _id: id }, { alias: id }] }]
	});
	if (!product) {
		return null;
	}
	const pictures = await loadCatalogPictures([product._id], picture);
	const vatRates = await loadCatalogVatRates([product as Product]);
	return toCatalogProductDto(
		product as Product,
		language,
		pictures.get(product._id),
		vatRates.get(product._id)
	);
}

export { catalogVisibilityFilter };
