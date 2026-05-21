<script lang="ts">
	import type { CountryAlpha2 } from '$lib/types/Country';
	import { sortCurrencies, currenciesToSelectOptions, type Currency } from '$lib/types/Currency';
	import { typedEntries } from '$lib/utils/typedEntries';
	import type { DeliveryFees, DeliveryZone } from '$lib/types/DeliveryFees';
	import { useI18n } from '$lib/i18n';
	import { onMount } from 'svelte';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { applyVat, extractVat } from '$lib/utils/vat';
	import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';

	export let deliveryFees: DeliveryFees = {};
	export let deliveryZones: DeliveryZone[] = [];
	export let defaultBlacklist: CountryAlpha2[] = [];
	export let defaultCurrency: Currency;
	export let disabled = false;
	// vatIncludedReference: entered amounts are TTC (true) or HT (false). vatRate (%): drives
	// the helper-text showing the inverse value under each input; 0 hides it.
	export let vatIncludedReference = false;
	export let vatRate = 0;
	// undefined → no import UI rendered (config page passes nothing; product passes the list).
	export let globalZones: DeliveryZone[] | undefined = undefined;

	let globalZoneToImport: number | null = null;

	const CUSTOM_ZONE_OPTION = '__customzone__';

	let countryToAdd: CountryAlpha2 | '' = '';
	let zonalOptionToAdd: 'default' | typeof CUSTOM_ZONE_OPTION = CUSTOM_ZONE_OPTION;

	const { countryName, sortedCountryCodes } = useI18n();

	// Currency options for Select components (sorted: main → secondary → BTC/SAT → fiat A-Z)
	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const allCurrenciesOptions = currenciesToSelectOptions(sortedCurrencies);

	// Track selected currencies for each country
	let selectedCurrencies: Record<string, { value: Currency; label: string } | null> = {};
	$: {
		for (const [country, fee] of typedEntries(deliveryFees)) {
			if (!selectedCurrencies[country] && fee) {
				selectedCurrencies[country] =
					allCurrenciesOptions.find((c) => c.value === fee.currency) || null;
			}
		}
	}

	// svelte-select value-state for each zone, mirrored from deliveryZones
	let zoneCountrySelections: Array<Array<{ value: CountryAlpha2; label: string }>> = [];
	$: deliveryZones.forEach((zone, i) => {
		if (!zoneCountrySelections[i]) {
			zoneCountrySelections[i] = zone.countries.map((country) => ({
				value: country,
				label: countryName(country)
			}));
		}
	});
	let zoneCurrencies: Array<{ value: Currency; label: string } | null> = [];
	$: deliveryZones.forEach((zone, i) => {
		if (!zoneCurrencies[i]) {
			zoneCurrencies[i] = allCurrenciesOptions.find((c) => c.value === zone.currency) || null;
		}
	});
	// Backward compat: zones from pre-`enabled` docs render as checked.
	$: deliveryZones.forEach((zone) => {
		if (zone.enabled === undefined) {
			zone.enabled = true;
		}
	});

	$: if (!deliveryFees) {
		deliveryFees = {};
	}
	$: if (!deliveryZones) {
		deliveryZones = [];
	}

	// Claimed countries stay visible but disabled (deliberate — visible-but-unselectable is
	// less confusing for admins than a silently missing entry).
	$: countryPickerItems = sortedCountryCodes().map((country) => ({
		value: country,
		disabled:
			!!deliveryFees[country] ||
			blacklistSelection.some((option) => option.value === country) ||
			zoneCountrySelections.some((selection) =>
				(selection ?? []).some((option) => option.value === country)
			)
	}));
	$: {
		const current = countryPickerItems.find((item) => item.value === countryToAdd);
		if (!current || current.disabled) {
			countryToAdd = countryPickerItems.find((item) => !item.disabled)?.value ?? '';
		}
	}
	$: if (zonalOptionToAdd === 'default' && deliveryFees.default) {
		zonalOptionToAdd = CUSTOM_ZONE_OPTION;
	}

	function onAmountInput(country: CountryAlpha2 | 'default', event: Event) {
		const fee = deliveryFees[country];
		if (!fee) {
			return;
		}
		const input = event.target as HTMLInputElement;
		const parsed = parseFloat(input.value);
		fee.amount = isNaN(parsed) ? 0 : parsed;
		deliveryFees = deliveryFees;
	}

	// Per-zone country options (excluding countries used elsewhere). Reassign ONLY on real
	// change — svelte-select re-emits `value` on every `items` ref change → infinite loop.
	let zoneCountryOptions: Array<
		Array<{ value: CountryAlpha2; label: string; selectable?: boolean }>
	> = [];
	let zoneCountryOptionsSignature = '';
	$: {
		const usedPerZone = deliveryZones.map((_, zoneIndex) =>
			[
				...Object.keys(deliveryFees).filter((country) => country !== 'default'),
				...blacklistSelection.map((option) => option.value),
				...zoneCountrySelections.flatMap((selection, index) =>
					index === zoneIndex ? [] : (selection ?? []).map((option) => option.value)
				)
			].sort()
		);
		const signature = JSON.stringify(usedPerZone);
		if (signature !== zoneCountryOptionsSignature) {
			zoneCountryOptionsSignature = signature;
			zoneCountryOptions = usedPerZone.map((used) => {
				const usedSet = new Set(used);
				return sortedCountryCodes().map((country) => ({
					value: country,
					label: countryName(country),
					selectable: !usedSet.has(country)
				}));
			});
		}
	}

	// Highlight stays until the enclosing <form> submits (onMount listener below).
	let recentlyAdded = new Set<string>();
	function highlightAdded(key: string) {
		recentlyAdded.add(key);
		recentlyAdded = recentlyAdded;
	}

	let anchorEl: HTMLDivElement;
	onMount(() => {
		const form = anchorEl?.closest('form');
		if (!form) {
			return;
		}
		const handler = () => {
			recentlyAdded = new Set();
		};
		form.addEventListener('submit', handler);
		return () => form.removeEventListener('submit', handler);
	});

	function addZone() {
		deliveryZones = [
			...deliveryZones,
			{ name: '', countries: [], amount: 0, currency: defaultCurrency, enabled: true }
		];
		zoneCountrySelections = [...zoneCountrySelections, []];
		zoneCurrencies = [
			...zoneCurrencies,
			allCurrenciesOptions.find((c) => c.value === defaultCurrency) || null
		];
		highlightAdded('zone:' + (deliveryZones.length - 1));
	}

	function removeZone(zoneIndex: number) {
		deliveryZones = deliveryZones.filter((_, index) => index !== zoneIndex);
		zoneCountrySelections = zoneCountrySelections.filter((_, index) => index !== zoneIndex);
		zoneCurrencies = zoneCurrencies.filter((_, index) => index !== zoneIndex);
	}

	function importGlobalZone(globalZone: DeliveryZone) {
		// `enabled: true` override — disabled is a global-template marker, not relevant per product.
		deliveryZones = [...deliveryZones, { ...structuredClone(globalZone), enabled: true }];
		zoneCountrySelections = [
			...zoneCountrySelections,
			globalZone.countries.map((country) => ({ value: country, label: countryName(country) }))
		];
		zoneCurrencies = [
			...zoneCurrencies,
			allCurrenciesOptions.find((c) => c.value === globalZone.currency) || null
		];
		highlightAdded('zone:' + (deliveryZones.length - 1));
	}

	// Stable ref: svelte-select re-emits `value` on every `items` ref change → infinite loop
	let blacklistOptions: Array<{ value: CountryAlpha2; label: string; selectable?: boolean }> = [];
	let blacklistOptionsSignature: string | null = null;
	$: {
		const used = [
			...Object.keys(deliveryFees).filter((c) => c !== 'default'),
			...zoneCountrySelections.flatMap((selection) =>
				(selection ?? []).map((option) => option.value)
			)
		].sort();
		const signature = used.join(',');
		if (signature !== blacklistOptionsSignature) {
			blacklistOptionsSignature = signature;
			const usedSet = new Set(used);
			blacklistOptions = sortedCountryCodes().map((c) => ({
				value: c,
				label: countryName(c),
				selectable: !usedSet.has(c)
			}));
		}
	}

	// Seeded once: a reactive backfill would re-add a chip the user just removed
	let blacklistSelection: Array<{ value: CountryAlpha2; label: string }> = (
		defaultBlacklist ?? []
	).map((c) => ({ value: c, label: countryName(c) }));
	// svelte-select clears the last chip to undefined, not [] — normalise
	$: if (!blacklistSelection) {
		blacklistSelection = [];
	}
</script>

<div class="checkbox-label" bind:this={anchorEl}>
	<select class="form-input max-w-[25rem]" {disabled} bind:value={countryToAdd}>
		{#each countryPickerItems as item}
			<option value={item.value} disabled={item.disabled}>{countryName(item.value)}</option>
		{/each}
	</select>
	<button
		type="button"
		disabled={disabled || !countryToAdd}
		on:click={() => {
			if (!countryToAdd) {
				return;
			}
			deliveryFees[countryToAdd] = structuredClone(deliveryFees.default) || {
				amount: 0,
				currency: defaultCurrency
			};
			highlightAdded('fee:' + countryToAdd);
		}}
		class="body-hyperlink underline"
	>
		Add individual country
	</button>
</div>

<div class="checkbox-label">
	<select class="form-input max-w-[25rem]" {disabled} bind:value={zonalOptionToAdd}>
		<option value={CUSTOM_ZONE_OPTION}>Custom zone</option>
		<option value="default" disabled={!!deliveryFees.default}>Other countries</option>
	</select>
	<button
		type="button"
		{disabled}
		on:click={() => {
			if (zonalOptionToAdd === CUSTOM_ZONE_OPTION) {
				addZone();
			} else {
				deliveryFees.default = { amount: 0, currency: defaultCurrency };
				highlightAdded('fee:default');
			}
		}}
		class="body-hyperlink underline"
	>
		Add zone or "Other countries"
	</button>
</div>

{#if globalZones && globalZones.length}
	<div class="checkbox-label">
		<select class="form-input max-w-[25rem]" {disabled} bind:value={globalZoneToImport}>
			<option value={null}>— select a global zone to import —</option>
			{#each globalZones as gz, i}
				<option value={i}>{gz.name}</option>
			{/each}
		</select>
		<button
			type="button"
			disabled={disabled || globalZoneToImport === null}
			on:click={() => {
				if (globalZoneToImport === null || !globalZones) {
					return;
				}
				importGlobalZone(globalZones[globalZoneToImport]);
				globalZoneToImport = null;
			}}
			class="body-hyperlink underline"
		>
			Import from global
		</button>
	</div>
{/if}

{#if deliveryFees.default || deliveryZones.length}
	<h2 class="text-lg font-semibold mt-2">Delivery zones</h2>
{/if}
{#if deliveryFees.default}
	<div class="flex flex-col gap-2" class:newly-added={recentlyAdded.has('fee:default')}>
		<h3 class="text-xl">Other countries</h3>
		<div class="gap-4 flex flex-col md:flex-row">
			<label class="w-full">
				Amount {vatIncludedReference ? '(VAT included)' : '(VAT excluded)'}
				<input
					class="form-input"
					type="number"
					{disabled}
					name="deliveryFees[default].amount"
					placeholder="Price"
					step="any"
					value={deliveryFees.default?.amount
						.toLocaleString('en', { maximumFractionDigits: 8 })
						.replace(/,/g, '')}
					on:input={(e) => onAmountInput('default', e)}
					required
				/>
				{#if vatRate > 0 && deliveryFees.default && selectedCurrencies['default']}
					{@const selectedCurrency = selectedCurrencies['default']?.value}
					{#if selectedCurrency}
						<small class="text-gray-500 block mt-1">
							{#if vatIncludedReference}
								= {fixCurrencyRounding(
									extractVat(deliveryFees.default.amount, vatRate),
									selectedCurrency
								)}
								{selectedCurrency} (VAT excluded)
							{:else}
								= {fixCurrencyRounding(
									applyVat(deliveryFees.default.amount, vatRate),
									selectedCurrency
								)}
								{selectedCurrency} (VAT included)
							{/if}
						</small>
					{/if}
				{/if}
			</label>

			<label class="w-full">
				<CurrencyLabel label="Currency" />
				<Select
					items={allCurrenciesOptions}
					searchable={true}
					clearable={false}
					bind:value={selectedCurrencies['default']}
					{disabled}
					class="form-input"
				/>
				<input
					type="hidden"
					name="deliveryFees[default].currency"
					value={selectedCurrencies['default']?.value || ''}
				/>
			</label>
		</div>
		<div class="w-full">
			Forbid delivery in these countries
			<Select
				items={blacklistOptions}
				multiple
				searchable={true}
				bind:value={blacklistSelection}
				{disabled}
				class="form-input"
			/>
		</div>
		{#each blacklistSelection as c, i (c.value)}
			<input type="hidden" name="defaultBlacklist[{i}]" value={c.value} />
		{/each}
		<button
			type="button"
			class="text-red-500 underline text-left"
			{disabled}
			on:click={() => {
				delete deliveryFees.default;
				deliveryFees = { ...deliveryFees };
			}}
		>
			Remove
		</button>
	</div>
{/if}
{#each deliveryZones as zone, i}
	<div class="flex flex-col gap-2" class:newly-added={recentlyAdded.has('zone:' + i)}>
		<h3 class="text-xl font-bold">{zone.name || 'New zone'}</h3>
		<label class="w-full">
			Delivery zone name
			<input
				class="form-input"
				type="text"
				{disabled}
				name="deliveryZones[{i}].name"
				placeholder="Zone name"
				bind:value={zone.name}
				required
			/>
		</label>
		<div class="gap-4 flex flex-col md:flex-row">
			<label class="w-full">
				Amount
				<input
					class="form-input"
					type="number"
					{disabled}
					name="deliveryZones[{i}].amount"
					placeholder="Price"
					step="any"
					bind:value={zone.amount}
					required
				/>
			</label>

			<label class="w-full">
				<CurrencyLabel label="Currency" />
				<Select
					items={allCurrenciesOptions}
					searchable={true}
					clearable={false}
					bind:value={zoneCurrencies[i]}
					{disabled}
					class="form-input"
				/>
				<input
					type="hidden"
					name="deliveryZones[{i}].currency"
					value={zoneCurrencies[i]?.value || ''}
				/>
			</label>
		</div>
		<label class="checkbox-label">
			<input
				type="checkbox"
				bind:checked={zone.enabled}
				name="deliveryZones[{i}].enabled"
				class="form-checkbox"
				{disabled}
			/>
			Enabled (uncheck to keep as a template only — won't apply to orders)
		</label>
		<div class="w-full">
			Countries constituting the delivery zone
			<Select
				items={zoneCountryOptions[i]}
				multiple
				searchable={true}
				bind:value={zoneCountrySelections[i]}
				{disabled}
				class="form-input"
			/>
		</div>
		{#each zoneCountrySelections[i] ?? [] as country, ci}
			<input type="hidden" name="deliveryZones[{i}].countries[{ci}]" value={country.value} />
		{/each}
		<button
			type="button"
			class="text-red-500 underline text-left"
			{disabled}
			on:click={() => removeZone(i)}
		>
			Remove zone
		</button>
	</div>
{/each}

{#if typedEntries(deliveryFees).some(([country]) => country !== 'default')}
	<h2 class="text-lg font-semibold mt-2">Individual countries</h2>
{/if}
{#each typedEntries(deliveryFees).filter(([country]) => country !== 'default') as [country, deliveryFee]}
	<div class="flex flex-col gap-2" class:newly-added={recentlyAdded.has('fee:' + country)}>
		<h3 class="text-xl">{countryName(country)}</h3>
		<div class="gap-4 flex flex-col md:flex-row">
			<label class="w-full">
				Amount {vatIncludedReference ? '(VAT included)' : '(VAT excluded)'}
				<input
					class="form-input"
					type="number"
					{disabled}
					name="deliveryFees[{country}].amount"
					placeholder="Price"
					step="any"
					value={deliveryFee?.amount
						.toLocaleString('en', { maximumFractionDigits: 8 })
						.replace(/,/g, '')}
					on:input={(e) => onAmountInput(country, e)}
					required
				/>
				{#if vatRate > 0 && deliveryFee && selectedCurrencies[country]}
					{@const selectedCurrency = selectedCurrencies[country]?.value}
					{#if selectedCurrency}
						<small class="text-gray-500 block mt-1">
							{#if vatIncludedReference}
								= {fixCurrencyRounding(extractVat(deliveryFee.amount, vatRate), selectedCurrency)}
								{selectedCurrency} (VAT excluded)
							{:else}
								= {fixCurrencyRounding(applyVat(deliveryFee.amount, vatRate), selectedCurrency)}
								{selectedCurrency} (VAT included)
							{/if}
						</small>
					{/if}
				{/if}
			</label>

			<label class="w-full">
				<CurrencyLabel label="Currency" />
				<Select
					items={allCurrenciesOptions}
					searchable={true}
					clearable={false}
					bind:value={selectedCurrencies[country]}
					{disabled}
					class="form-input"
				/>
				<input
					type="hidden"
					name="deliveryFees[{country}].currency"
					value={selectedCurrencies[country]?.value || ''}
				/>
			</label>
		</div>
		<button
			type="button"
			class="text-red-500 underline text-left"
			{disabled}
			on:click={() => {
				delete deliveryFees[country];
				deliveryFees = { ...deliveryFees };
			}}
		>
			Remove
		</button>
	</div>
{/each}

<style>
	.newly-added {
		background-color: #fef9c3;
	}
</style>
