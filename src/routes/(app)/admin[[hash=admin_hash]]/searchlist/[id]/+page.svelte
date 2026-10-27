<script lang="ts">
	import MultiSelect from 'svelte-multiselect';
	import {
		SORT_KEYS,
		PAGINATION_MODES,
		VIEW_MODES,
		SEARCH_TARGET_KEYS
	} from '$lib/types/Searchlist';
	import { currencies } from '$lib/stores/currencies';
	import { CURRENCY_UNIT } from '$lib/types/Currency';
	import { useI18n } from '$lib/i18n';

	export let data;
	const sl = data.searchlist;

	const { t } = useI18n();

	$: priceStep = CURRENCY_UNIT[$currencies.main];

	let name = sl.name;
	let displayWidgetName = sl.displayWidgetName ?? false;
	let hideSearchbar = sl.hideSearchbar;
	let prefillSearchterm = sl.prefillSearchterm;
	let initialSearchterm = sl.initialSearchterm ?? '';
	let hideSearchterm = sl.hideSearchterm;

	let searchTargets: Record<string, boolean> = { ...sl.searchTargets };

	let priceEnabled = sl.filters.price.enabled;
	let priceDefaultMin = sl.filters.price.defaultMin ?? '';
	let priceDefaultMax = sl.filters.price.defaultMax ?? '';
	let stockEnabled = sl.filters.stock.enabled;
	let stockDefaultChecked = sl.filters.stock.defaultChecked;
	let tagsEnabled = sl.filters.tags?.enabled ?? false;
	const initialAllowedTagIds = sl.filters.tags?.allowedTagIds ?? [];

	let sortDisplayed = sl.sort.displayed;
	let sortOptions: Record<string, boolean> = Object.fromEntries(
		SORT_KEYS.map((k) => [k, sl.sort.options.includes(k)])
	);
	let sortDefault = sl.sort.default;

	let viewDefault = sl.view.default;
	let viewHideToggle = sl.view.hideToggle;

	let paginationMode = sl.pagination.mode;
	let paginationPerPage = sl.pagination.perPage;

	let disabled = sl.disabled ?? false;
</script>

<h1 class="text-3xl">
	{t('admin.searchlist.editTitle')}
	<span class="text-gray-550">[Searchlist={sl._id}]</span>
</h1>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		{t('admin.searchlist.name')}
		<input class="form-input" type="text" name="name" bind:value={name} required maxlength="100" />
	</label>

	<label class="checkbox-label">
		<input type="checkbox" class="form-checkbox" name="disabled" bind:checked={disabled} />
		{t('admin.searchlist.disableSearchlist')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="displayWidgetName"
			bind:checked={displayWidgetName}
		/>
		{t('admin.searchlist.displayWidgetName')}
	</label>

	<h2 class="text-2xl">{t('admin.searchlist.searchInput')}</h2>

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="hideSearchbar"
			bind:checked={hideSearchbar}
		/>
		{t('admin.searchlist.hideSearchbar')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="prefillSearchterm"
			bind:checked={prefillSearchterm}
		/>
		{t('admin.searchlist.prefillSearchterm')}
	</label>

	{#if prefillSearchterm}
		<label class="form-label">
			{t('admin.searchlist.initialSearchterm')}
			<input
				class="form-input"
				type="text"
				name="initialSearchterm"
				bind:value={initialSearchterm}
				maxlength="200"
			/>
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				name="hideSearchterm"
				bind:checked={hideSearchterm}
			/>
			{t('admin.searchlist.hideSearchterm')}
		</label>
	{/if}

	<h2 class="text-2xl">{t('admin.searchlist.searchInputTarget')}</h2>
	{#each SEARCH_TARGET_KEYS as key}
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				name="searchTarget"
				value={key}
				bind:checked={searchTargets[key]}
			/>
			{key}
			{#if key === 'productTags' || key === 'productVariation'}
				<span class="text-gray-550">{t('admin.searchlist.notHonoredInV1')}</span>
			{/if}
		</label>
	{/each}

	<h2 class="text-2xl">{t('admin.searchlist.filters')}</h2>
	<label class="checkbox-label">
		<input type="checkbox" class="form-checkbox" name="priceEnabled" bind:checked={priceEnabled} />
		{t('admin.searchlist.priceFilter')}
	</label>
	{#if priceEnabled}
		<div class="flex gap-4 flex-wrap">
			<label class="form-label">
				{t('admin.searchlist.defaultMin', { currency: $currencies.main })}
				<input
					class="form-input"
					type="number"
					name="priceDefaultMin"
					bind:value={priceDefaultMin}
					on:wheel|preventDefault
					min="0"
					step={priceStep}
				/>
			</label>
			<label class="form-label">
				{t('admin.searchlist.defaultMax', { currency: $currencies.main })}
				<input
					class="form-input"
					type="number"
					name="priceDefaultMax"
					bind:value={priceDefaultMax}
					on:wheel|preventDefault
					min="0"
					step={priceStep}
				/>
			</label>
		</div>
	{/if}

	<label class="checkbox-label">
		<input type="checkbox" class="form-checkbox" name="stockEnabled" bind:checked={stockEnabled} />
		{t('admin.searchlist.stockFilter')}
	</label>
	{#if stockEnabled}
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				name="stockDefaultChecked"
				bind:checked={stockDefaultChecked}
			/>
			{t('admin.searchlist.stockDefaultChecked')}
		</label>
	{/if}

	<label class="checkbox-label">
		<input type="checkbox" class="form-checkbox" name="tagsEnabled" bind:checked={tagsEnabled} />
		{t('admin.searchlist.tagFilter')}
	</label>
	{#if tagsEnabled}
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label class="form-label">
			{t('admin.searchlist.tagsToExpose')}
			<MultiSelect
				--sms-options-bg="var(--body-mainPlan-backgroundColor)"
				name="allowedTagIds"
				options={data.tags.map((tag) => ({ value: tag._id, label: tag.name }))}
				selected={initialAllowedTagIds.map((tagId) => ({
					value: tagId,
					label: data.tags.find((tag) => tag._id === tagId)?.name ?? tagId
				}))}
			/>
		</label>
	{/if}

	<h2 class="text-2xl">{t('admin.searchlist.sort')}</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="sortDisplayed"
			bind:checked={sortDisplayed}
		/>
		{t('admin.searchlist.showSortBySelect')}
	</label>
	{#each SORT_KEYS as key}
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				name="sortOptions"
				value={key}
				bind:checked={sortOptions[key]}
			/>
			{key}
		</label>
	{/each}
	<label class="form-label">
		{t('admin.searchlist.defaultSort')}
		<select class="form-input" name="sortDefault" bind:value={sortDefault}>
			{#each SORT_KEYS as key}
				<option value={key}>{key}</option>
			{/each}
		</select>
	</label>

	<h2 class="text-2xl">{t('admin.searchlist.view')}</h2>
	<label class="form-label">
		{t('admin.searchlist.defaultView')}
		<select class="form-input" name="viewDefault" bind:value={viewDefault}>
			{#each VIEW_MODES as v}
				<option value={v}>{v}</option>
			{/each}
		</select>
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="viewHideToggle"
			bind:checked={viewHideToggle}
		/>
		{t('admin.searchlist.hideViewToggle')}
	</label>

	<h2 class="text-2xl">{t('admin.searchlist.pagination')}</h2>
	<label class="form-label">
		{t('admin.searchlist.mode')}
		<select class="form-input" name="paginationMode" bind:value={paginationMode}>
			{#each PAGINATION_MODES.filter((m) => m !== 'infinite') as m}
				<option value={m}>{m}</option>
			{/each}
		</select>
	</label>
	<label class="form-label">
		{t('admin.searchlist.perPage')}
		<input
			class="form-input"
			type="number"
			name="paginationPerPage"
			bind:value={paginationPerPage}
			on:wheel|preventDefault
			min="1"
			required
		/>
	</label>

	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue text-white"
			formaction="?/update"
			value={t('admin.action.update')}
		/>
		<a href="/searchlist/{sl._id}" class="btn body-mainCTA">{t('admin.searchlist.viewAction')}</a>

		{#if sl._id !== 'default' && sl._id !== 'search'}
			<input
				type="submit"
				class="btn btn-red text-white ml-auto"
				formaction="?/delete"
				value={t('admin.searchlist.deleteAction')}
				on:click={(e) => {
					if (!confirm(t('admin.searchlist.confirmDelete'))) {
						e.preventDefault();
					}
				}}
			/>
		{/if}
	</div>
</form>
