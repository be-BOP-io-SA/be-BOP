<script lang="ts">
	import MultiSelect from 'svelte-multiselect';
	import {
		SORT_KEYS,
		PAGINATION_MODES,
		VIEW_MODES,
		SEARCH_TARGET_KEYS
	} from '$lib/types/Searchlist';
	import { generateId } from '$lib/utils/generateId';
	import { currencies } from '$lib/stores/currencies';
	import { CURRENCY_UNIT } from '$lib/types/Currency';

	export let data;

	$: priceStep = CURRENCY_UNIT[$currencies.main];

	let name = '';
	let slug = '';
	let slugManuallyEdited = false;

	$: if (!slugManuallyEdited) {
		slug = name ? generateId(name, true) : '';
	}

	let displayWidgetName = false;
	let hideSearchbar = false;
	let prefillSearchterm = false;
	let initialSearchterm = '';
	let hideSearchterm = false;

	let searchTargets: Record<string, boolean> = {
		title: true,
		shortDescription: true,
		longDescription: true,
		productTags: false,
		productVariation: false,
		productCustomCta: false,
		productCmsBefore: false,
		productCmsAfter: false
	};

	let priceEnabled = true;
	let priceDefaultMin = '';
	let priceDefaultMax = '';
	let stockEnabled = true;
	let stockDefaultChecked = false;
	let tagsEnabled = false;

	let sortDisplayed = true;
	let sortOptions: Record<string, boolean> = Object.fromEntries(SORT_KEYS.map((k) => [k, true]));
	let sortDefault = 'alphaAsc';

	let viewDefault = 'grid';
	let viewHideToggle = false;

	let paginationMode = 'loadMore';
	let paginationPerPage = 12;
</script>

<h1 class="text-3xl">Add a searchlist</h1>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		Searchlist name
		<input class="form-input" type="text" name="name" bind:value={name} required maxlength="100" />
	</label>

	<label class="form-label">
		Slug
		<input
			class="form-input"
			type="text"
			name="slug"
			bind:value={slug}
			on:input={() => (slugManuallyEdited = true)}
			required
			pattern="[a-zA-Z0-9-]+"
		/>
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="displayWidgetName"
			bind:checked={displayWidgetName}
		/>
		Display widget name
	</label>

	<h2 class="text-2xl">Search input</h2>

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="hideSearchbar"
			bind:checked={hideSearchbar}
		/>
		Hide searchbar
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="prefillSearchterm"
			bind:checked={prefillSearchterm}
		/>
		Prefill searchterm
	</label>

	{#if prefillSearchterm}
		<label class="form-label">
			Initial searchterm
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
			Hide searchterm (a new search will override it)
		</label>
	{/if}

	<h2 class="text-2xl">Search input target</h2>
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
				<span class="text-gray-550">(not honored in V1)</span>
			{/if}
		</label>
	{/each}

	<h2 class="text-2xl">Filters</h2>
	<label class="checkbox-label">
		<input type="checkbox" class="form-checkbox" name="priceEnabled" bind:checked={priceEnabled} />
		Price filter
	</label>
	{#if priceEnabled}
		<div class="flex gap-4 flex-wrap">
			<label class="form-label">
				Default min ({$currencies.main})
				<input
					class="form-input"
					type="number"
					name="priceDefaultMin"
					bind:value={priceDefaultMin}
					min="0"
					step={priceStep}
				/>
			</label>
			<label class="form-label">
				Default max ({$currencies.main})
				<input
					class="form-input"
					type="number"
					name="priceDefaultMax"
					bind:value={priceDefaultMax}
					min="0"
					step={priceStep}
				/>
			</label>
		</div>
	{/if}

	<label class="checkbox-label">
		<input type="checkbox" class="form-checkbox" name="stockEnabled" bind:checked={stockEnabled} />
		Stock filter (in stock only)
	</label>
	{#if stockEnabled}
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				name="stockDefaultChecked"
				bind:checked={stockDefaultChecked}
			/>
			Default "in stock only" checked
		</label>
	{/if}

	<label class="checkbox-label">
		<input type="checkbox" class="form-checkbox" name="tagsEnabled" bind:checked={tagsEnabled} />
		Tag filter
	</label>
	{#if tagsEnabled}
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label class="form-label">
			Tags to expose
			<MultiSelect
				--sms-options-bg="var(--body-mainPlan-backgroundColor)"
				name="allowedTagIds"
				options={data.tags.map((tag) => ({ value: tag._id, label: tag.name }))}
			/>
		</label>
	{/if}

	<h2 class="text-2xl">Sort</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="sortDisplayed"
			bind:checked={sortDisplayed}
		/>
		Show "Sort by" select
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
		Default sort
		<select class="form-input" name="sortDefault" bind:value={sortDefault}>
			{#each SORT_KEYS as key}
				<option value={key}>{key}</option>
			{/each}
		</select>
	</label>

	<h2 class="text-2xl">View</h2>
	<label class="form-label">
		Default view
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
		Hide view toggle (force the default view)
	</label>

	<h2 class="text-2xl">Pagination</h2>
	<label class="form-label">
		Mode
		<select class="form-input" name="paginationMode" bind:value={paginationMode}>
			{#each PAGINATION_MODES.filter((m) => m !== 'infinite') as m}
				<option value={m}>{m}</option>
			{/each}
		</select>
	</label>
	<label class="form-label">
		Per page
		<input
			class="form-input"
			type="number"
			name="paginationPerPage"
			bind:value={paginationPerPage}
			min="1"
			required
		/>
	</label>

	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
