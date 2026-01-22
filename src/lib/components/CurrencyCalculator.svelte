<script lang="ts">
	import { sortCurrenciesDefault, type Currency } from '$lib/types/Currency';
	import { toCurrency } from '$lib/utils/toCurrency';
	import { currencies } from '$lib/stores/currencies';
	import { sellerIdentity } from '$lib/stores/sellerIdentity';
	import { getCurrencyFromCountry } from '$lib/types/Country';
	import Select from 'svelte-select';

	// Compute default second currency based on rules:
	// 1. secondary (if set)
	// 2. BTC (if main ≠ BTC)
	// 3. currency from seller's VAT country (if main = BTC)
	// 4. USD (fallback)
	function getDefaultSecondCurrency(
		main: Currency,
		secondary: Currency | null | undefined,
		sellerCountry: string | undefined
	): Currency {
		if (secondary) {
			return secondary;
		}
		if (main !== 'BTC') {
			return 'BTC';
		}
		const countryCurrency = getCurrencyFromCountry(
			sellerCountry as Parameters<typeof getCurrencyFromCountry>[0]
		);
		if (countryCurrency) {
			return countryCurrency as Currency;
		}
		return 'USD';
	}

	// Currency options sorted: main → secondary → BTC/SAT → fiat A-Z
	$: sortedCurrencies = sortCurrenciesDefault($currencies.main, $currencies.secondary);
	$: currencyOptions = sortedCurrencies.map((c) => ({ value: c, label: c }));

	let firstCurrencyAmount = 1;
	$: firstCurrencyDefault = $currencies.main;
	$: secondCurrencyDefault = getDefaultSecondCurrency(
		$currencies.main,
		$currencies.secondary,
		$sellerIdentity?.address?.country
	);

	let selectedFirstCurrency: { value: Currency; label: Currency } | null = null;
	let selectedSecondCurrency: { value: Currency; label: Currency } | null = null;
	let initialized = false;

	$: if (!initialized && currencyOptions.length > 0) {
		selectedFirstCurrency = currencyOptions.find((c) => c.value === firstCurrencyDefault) || null;
		selectedSecondCurrency =
			currencyOptions.find((c) => c.value === secondCurrencyDefault) || null;
		initialized = true;
	}

	$: firstCurrency = selectedFirstCurrency?.value ?? firstCurrencyDefault;
	$: secondCurrency = selectedSecondCurrency?.value ?? secondCurrencyDefault;
	$: secondCurrencyAmount = toCurrency(secondCurrency, firstCurrencyAmount, firstCurrency);
</script>

<div class="currency-calculator flex justify-center mx-auto max-w-3xl bg-gray-800 p-4 rounded-md">
	<div class="flex items-center bg-gray-900 text-white rounded-md m-1">
		<input
			type="number"
			class="form-input p-2 bg-transparent text-left text-white focus:outline-none w-24"
			bind:value={firstCurrencyAmount}
			min="0"
		/>
		<div class="currency-select">
			<Select
				items={currencyOptions}
				searchable={true}
				clearable={false}
				bind:value={selectedFirstCurrency}
				--background="rgb(55 65 81)"
				--border-radius="0.375rem"
				--border="none"
				--list-background="rgb(55 65 81)"
				--item-hover-bg="rgb(75 85 99)"
				--item-color="white"
				--list-color="white"
				--input-color="white"
				--placeholder-color="rgb(156 163 175)"
			/>
		</div>
	</div>

	<span class="text-gray-400 text-3xl m-1 self-center">→</span>

	<div class="flex items-center bg-gray-900 text-white rounded-md m-1">
		<input
			type="text"
			class="form-input p-2 bg-transparent text-left text-white focus:outline-none w-24"
			bind:value={secondCurrencyAmount}
			readonly
		/>
		<div class="currency-select">
			<Select
				items={currencyOptions}
				searchable={true}
				clearable={false}
				bind:value={selectedSecondCurrency}
				--background="rgb(55 65 81)"
				--border-radius="0.375rem"
				--border="none"
				--list-background="rgb(55 65 81)"
				--item-hover-bg="rgb(75 85 99)"
				--item-color="white"
				--list-color="white"
				--input-color="white"
				--placeholder-color="rgb(156 163 175)"
			/>
		</div>
	</div>
</div>

<style>
	.currency-select {
		min-width: 100px;
	}
</style>
