<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { goto } from '$app/navigation';
	import ProductWidget from './ProductWidget.svelte';
	import SearchlistGridTile from './SearchlistGridTile.svelte';
	import type { Picture } from '$lib/types/Picture';
	import type { ProductWidgetProduct } from './ProductWidget/ProductWidgetProduct';
	import type { Searchlist } from '$lib/types/Searchlist';
	import { SORT_KEYS, VIEW_MODES, type SortKey, type ViewMode } from '$lib/types/Searchlist';
	import type { SearchlistUrlState } from '$lib/server/searchlist';
	import { currencies } from '$lib/stores/currencies';
	import { CURRENCY_UNIT } from '$lib/types/Currency';

	export let searchlist: Searchlist;
	export let state: SearchlistUrlState;
	export let products: ProductWidgetProduct[];
	export let picturesByProductId: Record<string, Picture[]>;
	export let digitalFilesByProductId: Record<string, boolean>;
	export let hasPosOptions: boolean;
	export let total: number;
	export let totalPages: number;
	export let basePath: string;
	export let allowedTags: Array<{ _id: string; name: string }> = [];
	export let displayVatIncluded = false;
	export let embedded = false;

	let className = '';
	export { className as class };

	$: priceUnitLabel = displayVatIncluded ? `${$currencies.main} TTC` : $currencies.main;

	const { t } = useI18n();

	let qInput = state.q;
	let pmin = state.pmin ?? '';
	let pmax = state.pmax ?? '';
	let stockChecked = state.stock;
	let tagChoice = state.tag ?? '';
	let sortChoice: SortKey = state.sort;
	let viewChoice: ViewMode = state.view;

	$: showResults = total > 0;
	$: hasMorePages = state.page < totalPages;
	// V1: infinite scroll disabled (flaky); fall back to loadMore for existing configs.
	$: effectivePaginationMode =
		searchlist.pagination.mode === 'infinite' ? 'loadMore' : searchlist.pagination.mode;
	$: visibleSortOptions = SORT_KEYS.filter((k) => searchlist.sort.options.includes(k));
	$: hasInteractiveControls =
		!embedded &&
		(!searchlist.hideSearchbar ||
			searchlist.filters.price.enabled ||
			searchlist.filters.stock.enabled ||
			(searchlist.filters.tags?.enabled && allowedTags.length > 0) ||
			(searchlist.sort.displayed && visibleSortOptions.length > 0));

	function applyState(
		overrides: Partial<{
			q: string;
			pmin: string | number;
			pmax: string | number;
			stock: boolean;
			tag: string;
			sort: SortKey;
			view: ViewMode;
			page: number;
		}>
	) {
		const params = new URLSearchParams();
		const next = {
			q: overrides.q !== undefined ? overrides.q : qInput,
			pmin: overrides.pmin !== undefined ? overrides.pmin : pmin,
			pmax: overrides.pmax !== undefined ? overrides.pmax : pmax,
			stock: overrides.stock !== undefined ? overrides.stock : stockChecked,
			tag: overrides.tag !== undefined ? overrides.tag : tagChoice,
			sort: overrides.sort !== undefined ? overrides.sort : sortChoice,
			view: overrides.view !== undefined ? overrides.view : viewChoice,
			page: overrides.page !== undefined ? overrides.page : 1
		};
		if (next.q) {
			params.set('q', String(next.q));
		}
		if (searchlist.filters.price.enabled) {
			if (next.pmin !== '' && next.pmin !== undefined) {
				params.set('pmin', String(next.pmin));
			}
			if (next.pmax !== '' && next.pmax !== undefined) {
				params.set('pmax', String(next.pmax));
			}
		}
		if (searchlist.filters.stock.enabled && next.stock) {
			params.set('stock', '1');
		}
		if (searchlist.filters.tags?.enabled && next.tag) {
			params.set('tag', String(next.tag));
		}
		if (searchlist.sort.displayed && next.sort !== searchlist.sort.default) {
			params.set('sort', next.sort);
		}
		if (!searchlist.view.hideToggle && next.view !== searchlist.view.default) {
			params.set('view', next.view);
		}
		if (next.page && next.page > 1) {
			params.set('page', String(next.page));
		}
		const qs = params.toString();
		goto(qs ? `${basePath}?${qs}` : basePath, { keepFocus: true, noScroll: true });
	}

	function onSubmit(ev: SubmitEvent) {
		ev.preventDefault();
		applyState({ q: qInput, page: 1 });
	}

	function onReset() {
		qInput = searchlist.prefillSearchterm ? searchlist.initialSearchterm ?? '' : '';
		pmin = searchlist.filters.price.defaultMin ?? '';
		pmax = searchlist.filters.price.defaultMax ?? '';
		stockChecked = !!searchlist.filters.stock.defaultChecked;
		tagChoice = '';
		sortChoice = searchlist.sort.default;
		viewChoice = searchlist.view.default;
		goto(basePath, { keepFocus: true, noScroll: true });
	}

	function onSortChange() {
		applyState({ sort: sortChoice, page: 1 });
	}

	function onViewChange(v: ViewMode) {
		viewChoice = v;
		applyState({ view: v, page: 1 });
	}

	$: priceStep = CURRENCY_UNIT[$currencies.main];

	function clampToDisplayPrecision(raw: string | number): string | number {
		if (raw === '' || raw === undefined || raw === null) {
			return '';
		}
		const n = typeof raw === 'number' ? raw : Number(raw);
		if (!Number.isFinite(n)) {
			return '';
		}
		const factor = 1 / priceStep;
		return Math.round(n * factor) / factor;
	}

	function onFiltersApply() {
		pmin = clampToDisplayPrecision(pmin);
		pmax = clampToDisplayPrecision(pmax);
		applyState({ pmin, pmax, stock: stockChecked, page: 1 });
	}

	function onTagChange() {
		applyState({ tag: tagChoice, page: 1 });
	}

	function gotoPage(p: number) {
		applyState({ page: p });
	}

	function canBuyOf(p: ProductWidgetProduct): boolean {
		return hasPosOptions
			? p.actionSettings.retail.canBeAddedToBasket
			: p.actionSettings.eShop.canBeAddedToBasket;
	}

	// infinite-scroll helpers removed alongside the disabled mode (see effectivePaginationMode).
</script>

<div class="searchlist flex flex-col gap-4 {className}">
	{#if searchlist.disabled}
		<div class="rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-900">
			{t('searchlist.disabledNotice')}
		</div>
	{/if}
	{#if hasInteractiveControls}
		<form on:submit={onSubmit} class="flex flex-col gap-2">
			{#if !searchlist.hideSearchbar}
				<label class="form-label">
					{t('searchlist.searchbar.label')}
					<div class="flex gap-2 items-stretch">
						<input
							type="text"
							class="form-input flex-grow"
							name="q"
							bind:value={qInput}
							placeholder={t('searchlist.searchbar.placeholder')}
						/>
						<button
							type="submit"
							class="btn body-mainCTA px-3"
							aria-label={t('searchlist.searchbar.submit')}
						>
							🔍
						</button>
						<button
							type="button"
							class="btn body-secondaryCTA px-3"
							aria-label={t('searchlist.searchbar.reset')}
							on:click={onReset}
						>
							🧹
						</button>
					</div>
				</label>
			{:else}
				<div class="flex gap-2 items-stretch">
					<button
						type="submit"
						class="btn body-mainCTA px-3"
						aria-label={t('searchlist.searchbar.submit')}
					>
						🔍
					</button>
					<button
						type="button"
						class="btn body-secondaryCTA px-3"
						aria-label={t('searchlist.searchbar.reset')}
						on:click={onReset}
					>
						🧹
					</button>
				</div>
			{/if}
		</form>
	{/if}

	{#if !embedded && searchlist.sort.displayed && visibleSortOptions.length > 0}
		<label class="form-label">
			{t('searchlist.sort.label')}
			<select class="form-input" bind:value={sortChoice} on:change={onSortChange}>
				{#each visibleSortOptions as opt}
					<option value={opt}>{t(`searchlist.sort.options.${opt}`)}</option>
				{/each}
			</select>
		</label>
	{/if}

	{#if !embedded && searchlist.filters.tags?.enabled && allowedTags.length > 0}
		<label class="form-label">
			{t('searchlist.filters.tag.label')}
			<select class="form-input" bind:value={tagChoice} on:change={onTagChange}>
				<option value="">—</option>
				{#each allowedTags as tag}
					<option value={tag._id}>{tag.name}</option>
				{/each}
			</select>
		</label>
	{/if}

	{#if !embedded && searchlist.filters.price.enabled}
		<div class="flex flex-wrap gap-4 items-end">
			<label class="form-label">
				{t('searchlist.filters.price.minLabel')} ({priceUnitLabel})
				<input
					type="number"
					class="form-input"
					bind:value={pmin}
					on:change={onFiltersApply}
					on:wheel|preventDefault
					min="0"
					step={priceStep}
				/>
			</label>
			<label class="form-label">
				{t('searchlist.filters.price.maxLabel')} ({priceUnitLabel})
				<input
					type="number"
					class="form-input"
					bind:value={pmax}
					on:change={onFiltersApply}
					on:wheel|preventDefault
					min="0"
					step={priceStep}
				/>
			</label>
		</div>
	{/if}
	{#if !embedded && searchlist.filters.stock.enabled}
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				bind:checked={stockChecked}
				on:change={onFiltersApply}
			/>
			{t('searchlist.filters.stock.label')}
		</label>
	{/if}

	{#if !embedded && !searchlist.view.hideToggle}
		<div class="flex gap-3">
			{#each VIEW_MODES as v}
				<label class="checkbox-label">
					<input
						type="radio"
						class="form-radio"
						name="view"
						value={v}
						checked={viewChoice === v}
						on:change={() => onViewChange(v)}
					/>
					{t(`searchlist.view.${v}`)}
				</label>
			{/each}
		</div>
	{/if}

	{#if showResults}
		{#if viewChoice === 'grid'}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{#each products as product}
					<SearchlistGridTile {product} picture={picturesByProductId[product._id]?.[0]} />
				{/each}
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				{#each products as product}
					<ProductWidget
						{product}
						pictures={picturesByProductId[product._id] ?? []}
						hasDigitalFiles={digitalFilesByProductId[product._id] === true}
						canBuy={canBuyOf(product)}
						displayOption="img-3"
						class="not-prose"
					/>
				{/each}
			</div>
		{/if}

		{#if embedded}
			<!-- caller embeds the widget (e.g. CMS page): pagination off -->
		{:else if effectivePaginationMode === 'classic' && totalPages > 1}
			<div class="flex justify-between items-center mt-4">
				<button
					type="button"
					class="btn body-secondaryCTA"
					disabled={state.page <= 1}
					on:click={() => gotoPage(state.page - 1)}
				>
					{t('searchlist.pagination.prev')}
				</button>
				<span>{state.page} / {totalPages}</span>
				<button
					type="button"
					class="btn body-secondaryCTA"
					disabled={state.page >= totalPages}
					on:click={() => gotoPage(state.page + 1)}
				>
					{t('searchlist.pagination.next')}
				</button>
			</div>
		{:else if effectivePaginationMode === 'loadMore' && hasMorePages}
			<div class="flex justify-center mt-4">
				<button type="button" class="btn body-mainCTA" on:click={() => gotoPage(state.page + 1)}>
					{t('searchlist.pagination.loadMore')}
				</button>
			</div>
		{/if}
	{:else}
		<div class="flex flex-col gap-2 items-center py-6">
			<p>{t('searchlist.empty.title')}</p>
			<button type="button" class="btn body-secondaryCTA" on:click={onReset}>
				{t('searchlist.empty.reset')}
			</button>
		</div>
	{/if}
</div>
