import { collections } from '$lib/server/database';
import { error, redirect, type Actions } from '@sveltejs/kit';
import { z } from 'zod';
import { generateId } from '$lib/utils/generateId';
import { adminPrefix } from '$lib/server/admin';
import type { Tag } from '$lib/types/Tag';
import {
	SORT_KEYS,
	PAGINATION_MODES,
	VIEW_MODES,
	SEARCH_TARGET_KEYS,
	type SearchTargetKey
} from '$lib/types/Searchlist';

export const load = async () => {
	const tags = await collections.tags
		.find({})
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	return { tags };
};

const schema = z.object({
	name: z.string().min(1).max(100),
	slug: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-zA-Z0-9-]+$/),
	displayWidgetName: z.boolean({ coerce: true }).default(false),
	hideSearchbar: z.boolean({ coerce: true }).default(false),
	prefillSearchterm: z.boolean({ coerce: true }).default(false),
	initialSearchterm: z.string().max(200).optional(),
	hideSearchterm: z.boolean({ coerce: true }).default(false),
	priceEnabled: z.boolean({ coerce: true }).default(false),
	priceDefaultMin: z
		.string()
		.optional()
		.transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
	priceDefaultMax: z
		.string()
		.optional()
		.transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
	stockEnabled: z.boolean({ coerce: true }).default(false),
	stockDefaultChecked: z.boolean({ coerce: true }).default(false),
	tagsEnabled: z.boolean({ coerce: true }).default(false),
	sortDisplayed: z.boolean({ coerce: true }).default(false),
	sortDefault: z.enum(SORT_KEYS),
	viewDefault: z.enum(VIEW_MODES),
	viewHideToggle: z.boolean({ coerce: true }).default(false),
	paginationMode: z.enum(PAGINATION_MODES),
	paginationPerPage: z
		.string()
		.transform((v) => Number(v))
		.refine((n) => Number.isFinite(n) && n >= 1, { message: 'must be ≥ 1' })
});

function parseTagIds(raw: FormDataEntryValue | null): string[] {
	if (!raw) {
		return [];
	}
	try {
		const parsed = JSON.parse(String(raw)) as Array<{ value: string }>;
		return parsed.map((x) => String(x.value));
	} catch {
		return [];
	}
}

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const sortOptions = data.getAll('sortOptions').map(String);
		const targetsRaw = data.getAll('searchTarget').map(String);
		const allowedTagIds = parseTagIds(data.get('allowedTagIds'));

		const parsed = schema.parse({
			name: data.get('name'),
			slug: data.get('slug') || generateId(String(data.get('name') ?? ''), true),
			displayWidgetName: data.get('displayWidgetName'),
			hideSearchbar: data.get('hideSearchbar'),
			prefillSearchterm: data.get('prefillSearchterm'),
			initialSearchterm: data.get('initialSearchterm') ?? undefined,
			hideSearchterm: data.get('hideSearchterm'),
			priceEnabled: data.get('priceEnabled'),
			priceDefaultMin: data.get('priceDefaultMin') ?? undefined,
			priceDefaultMax: data.get('priceDefaultMax') ?? undefined,
			stockEnabled: data.get('stockEnabled'),
			stockDefaultChecked: data.get('stockDefaultChecked'),
			tagsEnabled: data.get('tagsEnabled'),
			sortDisplayed: data.get('sortDisplayed'),
			sortDefault: data.get('sortDefault'),
			viewDefault: data.get('viewDefault'),
			viewHideToggle: data.get('viewHideToggle'),
			paginationMode: data.get('paginationMode'),
			paginationPerPage: data.get('paginationPerPage')
		});

		const validSortOptions = SORT_KEYS.filter((k) => sortOptions.includes(k));
		if (validSortOptions.length === 0) {
			throw error(400, 'At least one sort option must be selected');
		}
		if (!validSortOptions.includes(parsed.sortDefault)) {
			throw error(400, 'Default sort option must be among the selected options');
		}

		const searchTargets = Object.fromEntries(
			SEARCH_TARGET_KEYS.map((k) => [k, targetsRaw.includes(k)])
		) as Record<SearchTargetKey, boolean>;

		const existing = await collections.searchlists.findOne({ _id: parsed.slug });
		if (existing) {
			throw error(400, `Searchlist with slug "${parsed.slug}" already exists`);
		}

		const now = new Date();
		await collections.searchlists.insertOne({
			_id: parsed.slug,
			name: parsed.name,
			displayWidgetName: parsed.displayWidgetName,
			hideSearchbar: parsed.hideSearchbar,
			prefillSearchterm: parsed.prefillSearchterm,
			hideSearchterm: parsed.hideSearchterm,
			...(parsed.initialSearchterm && { initialSearchterm: parsed.initialSearchterm }),
			searchTargets,
			filters: {
				price: {
					enabled: parsed.priceEnabled,
					...(parsed.priceDefaultMin !== undefined &&
						Number.isFinite(parsed.priceDefaultMin) && { defaultMin: parsed.priceDefaultMin }),
					...(parsed.priceDefaultMax !== undefined &&
						Number.isFinite(parsed.priceDefaultMax) && { defaultMax: parsed.priceDefaultMax })
				},
				stock: {
					enabled: parsed.stockEnabled,
					defaultChecked: parsed.stockDefaultChecked
				},
				tags: {
					enabled: parsed.tagsEnabled,
					allowedTagIds
				}
			},
			sort: {
				displayed: parsed.sortDisplayed,
				options: validSortOptions,
				default: parsed.sortDefault
			},
			view: {
				default: parsed.viewDefault,
				hideToggle: parsed.viewHideToggle
			},
			pagination: {
				mode: parsed.paginationMode,
				perPage: parsed.paginationPerPage
			},
			createdAt: now,
			updatedAt: now
		});

		throw redirect(303, `${adminPrefix()}/searchlist/${parsed.slug}`);
	}
};
