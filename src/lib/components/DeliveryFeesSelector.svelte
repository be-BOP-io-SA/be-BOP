<script lang="ts">
	import type { CountryAlpha2 } from '$lib/types/Country';
	import { sortCurrencies, currenciesToSelectOptions, type Currency } from '$lib/types/Currency';
	import { typedEntries } from '$lib/utils/typedEntries';
	import type { DeliveryFees } from '$lib/types/DeliveryFees';
	import { useI18n } from '$lib/i18n';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';

	export let deliveryFees: DeliveryFees = {};
	export let defaultBlacklist: CountryAlpha2[] = [];
	export let defaultCurrency: Currency;
	export let disabled = false;

	let feeCountryToAdd: CountryAlpha2 | 'default' = 'default';

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

	$: if (!deliveryFees) {
		deliveryFees = {};
	}

	$: countriesWithNoFee = ['default' as const, ...sortedCountryCodes()].filter(
		(country) =>
			!deliveryFees[country] &&
			(country === 'default' || !blacklistSelection.some((option) => option.value === country))
	);
	$: feeCountryToAdd = countriesWithNoFee.includes(feeCountryToAdd)
		? feeCountryToAdd
		: countriesWithNoFee[0];

	// Stable ref: svelte-select re-emits `value` on every `items` ref change → infinite loop
	let blacklistOptions: Array<{ value: CountryAlpha2; label: string }> = [];
	let blacklistOptionsSignature: string | null = null;
	$: {
		const used = Object.keys(deliveryFees)
			.filter((c) => c !== 'default')
			.sort();
		const signature = used.join(',');
		if (signature !== blacklistOptionsSignature) {
			blacklistOptionsSignature = signature;
			const usedSet = new Set(used);
			blacklistOptions = sortedCountryCodes()
				.filter((c) => !usedSet.has(c))
				.map((c) => ({ value: c, label: countryName(c) }));
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

{#if countriesWithNoFee.length}
	<div class="checkbox-label">
		<select class="form-input max-w-[25rem]" {disabled} bind:value={feeCountryToAdd}>
			{#each countriesWithNoFee as country}
				<option value={country}>
					{country === 'default' ? 'Other countries' : countryName(country)}
				</option>
			{/each}
		</select>
		<button
			type="button"
			{disabled}
			on:click={() =>
				(deliveryFees[feeCountryToAdd] = structuredClone(deliveryFees.default) || {
					amount: 0,
					currency: defaultCurrency
				})}
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
		{#if country === 'default'}
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
		{/if}
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
