import { collections } from '$lib/server/database';
import { error, redirect, type Actions } from '@sveltejs/kit';
import { z } from 'zod';
import { adminPrefix } from '$lib/server/admin';
import type { Tag } from '$lib/types/Tag';
import {
	SORT_KEYS,
	PAGINATION_MODES,
	VIEW_MODES,
	SEARCH_TARGET_KEYS,
	type SearchTargetKey
} from '$lib/types/Searchlist';

export const load = async ({ params }) => {
	const searchlist = await collections.searchlists.findOne({ _id: params.id });
	if (!searchlist) {
		throw error(404, 'Searchlist not found');
	}
	const tags = await collections.tags
		.find({})
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	return { searchlist, tags };
};

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

const updateSchema = z.object({
	name: z.string().min(1).max(100),
	disabled: z.boolean({ coerce: true }).default(false),
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

export const actions: Actions = {
	update: async ({ request, params }) => {
		const data = await request.formData();
		const sortOptions = data.getAll('sortOptions').map(String);
		const targetsRaw = data.getAll('searchTarget').map(String);
		const allowedTagIds = parseTagIds(data.get('allowedTagIds'));

		const parsed = updateSchema.parse({
			name: data.get('name'),
			disabled: data.get('disabled'),
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

		const $set: Record<string, unknown> = {
			name: parsed.name,
			disabled: parsed.disabled,
			displayWidgetName: parsed.displayWidgetName,
			hideSearchbar: parsed.hideSearchbar,
			prefillSearchterm: parsed.prefillSearchterm,
			hideSearchterm: parsed.hideSearchterm,
			searchTargets,
			filters: {
				price: {
					enabled: parsed.priceEnabled,
					...(parsed.priceDefaultMin !== undefined &&
						Number.isFinite(parsed.priceDefaultMin) && {
							defaultMin: parsed.priceDefaultMin
						}),
					...(parsed.priceDefaultMax !== undefined &&
						Number.isFinite(parsed.priceDefaultMax) && {
							defaultMax: parsed.priceDefaultMax
						})
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
			updatedAt: new Date()
		};
		const update: Record<string, unknown> = { $set };
		if (parsed.initialSearchterm) {
			$set.initialSearchterm = parsed.initialSearchterm;
		} else {
			update.$unset = { initialSearchterm: '' };
		}

		await collections.searchlists.updateOne({ _id: params.id }, update);

		throw redirect(303, `${adminPrefix()}/searchlist/${params.id}`);
	},
	delete: async ({ params }) => {
		if (params.id === 'default' || params.id === 'search') {
			throw error(400, `The "${params.id}" searchlist cannot be deleted`);
		}
		await collections.searchlists.deleteOne({ _id: params.id });
		throw redirect(303, `${adminPrefix()}/searchlist`);
	}
};
