import { ObjectId, type Document, type Filter } from 'mongodb';
import { collections } from './database';
import type {
	Searchlist,
	SearchTargetKey,
	SortKey,
	ViewMode,
	PaginationMode
} from '$lib/types/Searchlist';
import { SORT_KEYS, VIEW_MODES, PAGINATION_MODES } from '$lib/types/Searchlist';
import type { Product } from '$lib/types/Product';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { runtimeConfig } from './runtime-config';
import { CURRENCIES, CURRENCY_UNIT, type Currency } from '$lib/types/Currency';
import type { CountryAlpha2 } from '$lib/types/Country';
import { computeVatRate } from '$lib/utils/vat';
import type { PickDeep } from 'type-fest';

// Only the locals fields searchlist rendering actually reads. Narrow on purpose so
// callers without a full App.Locals (e.g. cmsFromContent) can drive a search.
export type SearchlistLocals = Pick<App.Locals, 'language'> &
	Partial<PickDeep<App.Locals, 'user.roleId' | 'countryCode'>>;

export const MAX_SEARCH_TERM_LENGTH = 64;
export const MAX_CUMULATIVE_PAGES = 100;

// 1 unit of `from` equals X units of `main`. Uses raw rates to avoid the
// display-precision rounding that toCurrency applies (which would zero out
// small ratios like 1 SAT → EUR).
export function mainPerCurrency(from: Currency, main: Currency): number {
	const rates = runtimeConfig.exchangeRate;
	const fromRate = from === 'BTC' ? 1 : rates[from];
	const mainRate = main === 'BTC' ? 1 : rates[main];
	if (fromRate === undefined || mainRate === undefined) {
		console.warn(
			`[searchlist] missing exchange rate (from=${from}, main=${main}); falling back to 1:1`
		);
		return 1;
	}
	return mainRate / fromRate;
}

export type SearchlistUrlState = {
	q: string;
	pmin?: number;
	pmax?: number;
	stock: boolean;
	tag?: string;
	sort: SortKey;
	view: ViewMode;
	page: number;
};

const TAG_PATTERN_GLOBAL = /(?:^|\s)tag:([a-z0-9-]+)/gi;

export function extractTagsFromTerm(term: string): { tagIds: string[]; remaining: string } {
	const tagIds: string[] = [];
	const remaining = term
		.replace(TAG_PATTERN_GLOBAL, (_match, tagId) => {
			tagIds.push(String(tagId));
			return ' ';
		})
		.replace(/\s+/g, ' ')
		.trim();
	return { tagIds, remaining };
}

export function readUrlState(
	url: URL,
	searchlist: Pick<
		Searchlist,
		'filters' | 'sort' | 'view' | 'prefillSearchterm' | 'initialSearchterm'
	>
): SearchlistUrlState {
	const q = url.searchParams.get('q');
	const initial = searchlist.prefillSearchterm ? searchlist.initialSearchterm ?? '' : '';

	const sortParam = url.searchParams.get('sort');
	const sort: SortKey = SORT_KEYS.includes(sortParam as SortKey)
		? (sortParam as SortKey)
		: searchlist.sort.default;

	const viewParam = url.searchParams.get('view');
	const view: ViewMode = VIEW_MODES.includes(viewParam as ViewMode)
		? (viewParam as ViewMode)
		: searchlist.view.default;

	const pmin = parseOptionalNumber(
		url.searchParams.get('pmin'),
		searchlist.filters.price.defaultMin
	);
	const pmax = parseOptionalNumber(
		url.searchParams.get('pmax'),
		searchlist.filters.price.defaultMax
	);

	const stockParam = url.searchParams.get('stock');
	const stock =
		stockParam !== null ? stockParam === '1' : !!searchlist.filters.stock.defaultChecked;

	const tag = url.searchParams.get('tag') || undefined;

	const page = parsePositiveInt(url.searchParams.get('page'), 1);

	return {
		q: q ?? initial,
		pmin,
		pmax,
		stock,
		tag,
		sort,
		view,
		page
	};
}

function parseOptionalNumber(raw: string | null, fallback: number | undefined): number | undefined {
	if (raw === null || raw === '') {
		return fallback;
	}
	const n = Number(raw);
	return Number.isFinite(n) ? n : fallback;
}

function parsePositiveInt(raw: string | null, fallback: number): number {
	if (raw === null) {
		return fallback;
	}
	const n = parseInt(raw, 10);
	return Number.isFinite(n) && n >= 1 ? n : fallback;
}

// productTags + productVariation: admin can toggle the option in V1 but the search
// logic does not honor them yet (extra tag lookup + dynamic variationLabels paths).
const TARGET_TO_FIELDS: Record<SearchTargetKey, string[]> = {
	title: ['name'],
	shortDescription: ['shortDescription'],
	longDescription: ['description'],
	productTags: [],
	productVariation: [],
	productCustomCta: ['cta.label'],
	productCmsBefore: ['contentBefore'],
	productCmsAfter: ['contentAfter']
};

/**
 * Builds the $or clauses for the search term. The regex is escaped, but it is
 * NOT anchored and uses case-insensitive matching, which forces a collection
 * scan in Mongo. Acceptable on small product catalogs; for scale, replace with
 * a $text index or a dedicated search engine (Meilisearch / Atlas Search).
 */
export function buildSearchOrClauses(
	term: string,
	targets: Record<SearchTargetKey, boolean>,
	language: string
): Filter<Product>[] {
	const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = { $regex: safe, $options: 'i' };
	const clauses: Filter<Product>[] = [];
	for (const target of Object.keys(targets) as SearchTargetKey[]) {
		if (!targets[target]) {
			continue;
		}
		for (const field of TARGET_TO_FIELDS[target]) {
			clauses.push({ [field]: regex } as Filter<Product>);
			clauses.push({ [`translations.${language}.${field}`]: regex } as Filter<Product>);
		}
	}
	return clauses;
}

export type SearchResult = {
	products: Pick<
		Product,
		| '_id'
		| 'name'
		| 'shortDescription'
		| 'price'
		| 'shipping'
		| 'preorder'
		| 'availableDate'
		| 'standalone'
		| 'tagIds'
		| 'stock'
		| 'actionSettings'
		| 'type'
		| 'free'
		| 'isTicket'
		| 'payWhatYouWant'
		| 'maxQuantityPerOrder'
		| 'mobile'
	>[];
	total: number;
	totalPages: number;
};

export type VatContext = {
	vatProfiles: Array<{ _id: string; rates: Partial<Record<CountryAlpha2, number>> }>;
	bebopCountry: CountryAlpha2 | undefined;
	userCountry: CountryAlpha2 | undefined;
	vatSingleCountry: boolean;
	displayVatIncluded: boolean;
};

export async function searchProducts(
	searchlist: Searchlist,
	state: SearchlistUrlState,
	locals: SearchlistLocals,
	vat: VatContext
): Promise<SearchResult> {
	const isEmployee = locals.user?.roleId !== undefined && locals.user.roleId !== CUSTOMER_ROLE_ID;

	const baseFilter: Filter<Product> = {};

	if (!isEmployee) {
		baseFilter['actionSettings.eShop.visible'] = true;
	}

	const cappedTerm = state.q.slice(0, MAX_SEARCH_TERM_LENGTH);
	const { tagIds: extractedTagIds, remaining: remainingTerm } = extractTagsFromTerm(cappedTerm);

	if (remainingTerm.trim()) {
		const clauses = buildSearchOrClauses(
			remainingTerm.trim(),
			searchlist.searchTargets,
			locals.language
		);
		if (clauses.length > 0) {
			baseFilter.$or = clauses;
		}
	}

	if (searchlist.filters.tags?.enabled) {
		const allowed = new Set(searchlist.filters.tags.allowedTagIds ?? []);
		const tagFromDropdown = state.tag && allowed.has(state.tag) ? [state.tag] : [];
		const finalTagIds = [...new Set([...extractedTagIds, ...tagFromDropdown])];
		if (finalTagIds.length > 0) {
			baseFilter.tagIds = { $all: finalTagIds };
		}
	}

	if (searchlist.filters.stock.enabled && state.stock) {
		baseFilter.$and = [
			...((baseFilter.$and as Filter<Product>[]) ?? []),
			{ $or: [{ stock: { $exists: false } }, { 'stock.available': { $gt: 0 } }] }
		];
	}

	const main = runtimeConfig.mainCurrency;
	const factorBranches = CURRENCIES.map((c) => ({
		case: { $eq: ['$price.currency', c] },
		then: mainPerCurrency(c, main)
	}));
	// _factor defaults to 0 for any currency outside CURRENCIES (data corruption /
	// outdated CURRENCIES list); products in those would silently get _priceInMain=0.
	// Surface it so a dev notices when adding/removing a supported currency.

	const vatMultExpr: Document = vat.displayVatIncluded
		? (() => {
				const defaultRate = computeVatRate({
					productVatProfileId: undefined,
					vatProfiles: vat.vatProfiles,
					bebopCountry: vat.bebopCountry,
					userCountry: vat.userCountry,
					vatSingleCountry: vat.vatSingleCountry
				});
				const branches = vat.vatProfiles.map((vp) => ({
					case: { $eq: ['$vatProfileId', new ObjectId(vp._id)] },
					then:
						1 +
						computeVatRate({
							productVatProfileId: vp._id,
							vatProfiles: vat.vatProfiles,
							bebopCountry: vat.bebopCountry,
							userCountry: vat.userCountry,
							vatSingleCountry: vat.vatSingleCountry
						}) /
							100
				}));
				return branches.length > 0
					? { $switch: { branches, default: 1 + defaultRate / 100 } }
					: { $literal: 1 + defaultRate / 100 };
		  })()
		: { $literal: 1 };

	// pmin/pmax are in mainCurrency, TTC when displayVatIncluded matches the
	// displayed unit. Half-display-unit tolerance so a product whose displayed
	// price rounds to the bound (e.g. 2.9213 → 2.92 EUR) is included.
	const halfDisplayUnit = CURRENCY_UNIT[main] / 2;
	const boundsMatch: Record<string, number> = {};
	if (searchlist.filters.price.enabled) {
		if (typeof state.pmin === 'number') {
			boundsMatch.$gte = state.pmin - halfDisplayUnit;
		}
		if (typeof state.pmax === 'number') {
			boundsMatch.$lte = state.pmax + halfDisplayUnit;
		}
	}

	const perPage = searchlist.pagination.perPage;
	// V1 known cost: loadMore/infinite re-queries cumulatively (limit = perPage * page),
	// so listing N pages is O(perPage * page) — quadratic in scroll depth. We clamp the
	// page to MAX_CUMULATIVE_PAGES to keep the worst case bounded. Switch to a cursor
	// strategy in a follow-up if catalog grows.
	const effectiveMode =
		searchlist.pagination.mode === 'infinite' ? 'loadMore' : searchlist.pagination.mode;
	const clampedPage =
		effectiveMode === 'classic' ? state.page : Math.min(state.page, MAX_CUMULATIVE_PAGES);
	const limit = effectiveMode === 'classic' ? perPage : perPage * clampedPage;
	const skip = effectiveMode === 'classic' ? (clampedPage - 1) * perPage : 0;

	const sortSpec: Record<string, 1 | -1> =
		state.sort === 'priceAsc'
			? { _priceInMain: 1, _id: 1 }
			: state.sort === 'priceDesc'
			? { _priceInMain: -1, _id: -1 }
			: state.sort === 'alphaAsc'
			? { name: 1, _id: 1 }
			: state.sort === 'alphaDesc'
			? { name: -1, _id: -1 }
			: state.sort === 'createdAsc'
			? { createdAt: 1, _id: 1 }
			: { createdAt: -1, _id: -1 };

	const priceProjection: Document = vat.displayVatIncluded
		? { amount: { $multiply: ['$price.amount', '$_vatMult'] }, currency: '$price.currency' }
		: { amount: '$price.amount', currency: '$price.currency' };

	const projection: Document = {
		_id: 1,
		name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] },
		shortDescription: {
			$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
		},
		price: priceProjection,
		shipping: 1,
		preorder: 1,
		availableDate: 1,
		standalone: 1,
		tagIds: 1,
		stock: 1,
		actionSettings: 1,
		type: 1,
		free: 1,
		isTicket: 1,
		payWhatYouWant: 1,
		maxQuantityPerOrder: 1,
		mobile: 1
	};

	const pipeline: Document[] = [
		{ $match: baseFilter },
		{
			$addFields: {
				_factor: { $switch: { branches: factorBranches, default: 0 } },
				_vatMult: vatMultExpr
			}
		},
		{
			$addFields: {
				_priceInMain: { $multiply: ['$price.amount', '$_factor', '$_vatMult'] }
			}
		}
	];
	if (Object.keys(boundsMatch).length > 0) {
		pipeline.push({ $match: { _priceInMain: boundsMatch } });
	}
	pipeline.push({
		$facet: {
			products: [{ $sort: sortSpec }, { $skip: skip }, { $limit: limit }, { $project: projection }],
			count: [{ $count: 'total' }],
			unknownCurrency: [
				{ $match: { 'price.currency': { $nin: [...CURRENCIES] } } },
				{ $count: 'n' }
			]
		}
	});

	type ProductHit = SearchResult['products'][number];
	type FacetResult = {
		products: ProductHit[];
		count: Array<{ total: number }>;
		unknownCurrency: Array<{ n: number }>;
	};

	const [facet] = await collections.products.aggregate<FacetResult>(pipeline).toArray();
	const products = facet?.products ?? [];
	const total = facet?.count[0]?.total ?? 0;
	const unknownCurrencyCount = facet?.unknownCurrency[0]?.n ?? 0;
	if (unknownCurrencyCount > 0) {
		console.warn(
			`[searchlist] ${unknownCurrencyCount} product(s) have a currency outside CURRENCIES; _factor=0 applied`
		);
	}

	return {
		products,
		total,
		totalPages: Math.max(1, Math.ceil(total / perPage))
	};
}

export function isPaginationMode(value: string): value is PaginationMode {
	return PAGINATION_MODES.includes(value as PaginationMode);
}
