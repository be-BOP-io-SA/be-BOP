<script lang="ts">
	import type { CountryAlpha2 } from '$lib/types/Country';
	import { sortCurrencies, currenciesToSelectOptions, type Currency } from '$lib/types/Currency';
	import { typedEntries } from '$lib/utils/typedEntries';
	import type { DeliveryFees, DeliveryZone } from '$lib/types/DeliveryFees';
	import { useI18n } from '$lib/i18n';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';

	export let deliveryFees: DeliveryFees = {};
	export let deliveryZones: DeliveryZone[] = [];
	export let defaultCurrency: Currency;
	export let disabled = false;

	const CUSTOM_ZONE_OPTION = '__customzone__';

	let feeOptionToAdd: CountryAlpha2 | 'default' | typeof CUSTOM_ZONE_OPTION = 'default';

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

	$: if (!deliveryFees) {
		deliveryFees = {};
	}
	$: if (!deliveryZones) {
		deliveryZones = [];
	}

	$: countriesWithNoFee = ['default' as const, ...sortedCountryCodes()].filter(
		(country) => !deliveryFees[country]
	);
	$: feeOptionToAdd =
		feeOptionToAdd === CUSTOM_ZONE_OPTION || countriesWithNoFee.includes(feeOptionToAdd)
			? feeOptionToAdd
			: countriesWithNoFee[0];

	// Per-zone country options (excluding countries used elsewhere). Reassign ONLY on real
	// change — svelte-select re-emits `value` on every `items` ref change → infinite loop.
	let zoneCountryOptions: Array<Array<{ value: CountryAlpha2; label: string }>> = [];
	let zoneCountryOptionsSignature = '';
	$: {
		const usedPerZone = deliveryZones.map((_, zoneIndex) =>
			[
				...Object.keys(deliveryFees).filter((country) => country !== 'default'),
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
				return sortedCountryCodes()
					.filter((country) => !usedSet.has(country))
					.map((country) => ({ value: country, label: countryName(country) }));
			});
		}
	}

	function addZone() {
		deliveryZones = [
			...deliveryZones,
			{ name: '', countries: [], amount: 0, currency: defaultCurrency }
		];
		zoneCountrySelections = [...zoneCountrySelections, []];
		zoneCurrencies = [
			...zoneCurrencies,
			allCurrenciesOptions.find((c) => c.value === defaultCurrency) || null
		];
	}

	function removeZone(zoneIndex: number) {
		deliveryZones = deliveryZones.filter((_, index) => index !== zoneIndex);
		zoneCountrySelections = zoneCountrySelections.filter((_, index) => index !== zoneIndex);
		zoneCurrencies = zoneCurrencies.filter((_, index) => index !== zoneIndex);
	}
</script>

{#if countriesWithNoFee.length}
	<div class="checkbox-label">
		<select class="form-input max-w-[25rem]" {disabled} bind:value={feeOptionToAdd}>
			<option value={CUSTOM_ZONE_OPTION}>Custom zone</option>
			{#each countriesWithNoFee as country}
				<option value={country}>
					{country === 'default' ? 'Other countries' : countryName(country)}
				</option>
			{/each}
		</select>
		<button
			type="button"
			{disabled}
			on:click={() => {
				if (feeOptionToAdd === CUSTOM_ZONE_OPTION) {
					addZone();
				} else {
					deliveryFees[feeOptionToAdd] = structuredClone(deliveryFees.default) || {
						amount: 0,
						currency: defaultCurrency
					};
				}
			}}
			class="body-hyperlink underline"
		>
			Add fee option
		</button>
	</div>
{/if}

{#each typedEntries(deliveryFees) as [country, deliveryFee]}
	<div class="flex flex-col gap-2">
		<h3 class="text-xl">
			{country === 'default' ? 'Other countries' : countryName(country)}
		</h3>
		<div class="gap-4 flex flex-col md:flex-row">
			<label class="w-full">
				Amount
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
					required
				/>
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

{#each deliveryZones as zone, i}
	<div class="flex flex-col gap-2">
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
