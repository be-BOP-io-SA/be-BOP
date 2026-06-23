import type { Timestamps } from './Timestamps';

export const SORT_KEYS = [
	'alphaAsc',
	'alphaDesc',
	'priceAsc',
	'priceDesc',
	'createdAsc',
	'createdDesc'
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SEARCH_TARGET_KEYS = [
	'title',
	'shortDescription',
	'longDescription',
	'productTags',
	'productVariation',
	'productCustomCta',
	'productCmsBefore',
	'productCmsAfter'
] as const;
export type SearchTargetKey = (typeof SEARCH_TARGET_KEYS)[number];

export const PAGINATION_MODES = ['classic', 'loadMore', 'infinite'] as const;
export type PaginationMode = (typeof PAGINATION_MODES)[number];

export const VIEW_MODES = ['grid', 'list'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export type Searchlist = Timestamps & {
	_id: string;
	name: string;

	/**
	 * When true, /searchlist/{slug} returns 404 to the public and CMS embeds
	 * skip the widget. Employees still see both with a "disabled" banner.
	 */
	disabled?: boolean;

	displayWidgetName: boolean;
	hideSearchbar: boolean;
	prefillSearchterm: boolean;
	initialSearchterm?: string;
	hideSearchterm: boolean;

	searchTargets: Record<SearchTargetKey, boolean>;

	filters: {
		price: {
			enabled: boolean;
			defaultMin?: number;
			defaultMax?: number;
		};
		stock: {
			enabled: boolean;
			defaultChecked: boolean;
		};
		tags: {
			enabled: boolean;
			allowedTagIds: string[];
		};
	};

	sort: {
		displayed: boolean;
		options: SortKey[];
		default: SortKey;
	};

	view: {
		default: ViewMode;
		hideToggle: boolean;
	};

	pagination: {
		mode: PaginationMode;
		perPage: number;
	};
};

export const DEFAULT_SEARCH_TARGETS: Record<SearchTargetKey, boolean> = {
	title: true,
	shortDescription: true,
	longDescription: true,
	productTags: false,
	productVariation: false,
	productCustomCta: false,
	productCmsBefore: false,
	productCmsAfter: false
};
