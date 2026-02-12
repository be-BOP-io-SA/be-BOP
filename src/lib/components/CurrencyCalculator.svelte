<script lang="ts">
	import { sortCurrenciesDefault, type Currency } from '$lib/types/Currency';
	import { toCurrency } from '$lib/utils/toCurrency';
	import { currencies } from '$lib/stores/currencies';
	import { sellerIdentity } from '$lib/stores/sellerIdentity';
	import { getCurrencyFromCountry } from '$lib/types/Country';
	import Select from 'svelte-select';
	import { get } from 'svelte/store';

	// Get initial values from stores
	const initialCurrencies = get(currencies);
	const initialSellerIdentity = get(sellerIdentity);

	// Currency options sorted: main → secondary → BTC/SAT → fiat A-Z
	const sortedCurrencies = sortCurrenciesDefault(
		initialCurrencies.main,
		initialCurrencies.secondary
	);
	const currencyOptions = sortedCurrencies.map((c) => ({ value: c, label: c }));

	// Compute default second currency
	function getDefaultSecondCurrency(): Currency {
		if (initialCurrencies.secondary) {
			return initialCurrencies.secondary;
		}
		if (initialCurrencies.main !== 'BTC') {
			return 'BTC';
		}
		const countryCurrency = getCurrencyFromCountry(
			initialSellerIdentity?.address?.country as Parameters<typeof getCurrencyFromCountry>[0]
		);
		if (countryCurrency) {
			return countryCurrency as Currency;
		}
		return 'USD';
	}

	// Initialize selected values
	let selectedFirstCurrency =
		currencyOptions.find((c) => c.value === initialCurrencies.main) || currencyOptions[0];
	let selectedSecondCurrency =
		currencyOptions.find((c) => c.value === getDefaultSecondCurrency()) || currencyOptions[1];

	let firstCurrencyAmount = 1;

	$: firstCurrency = selectedFirstCurrency?.value || initialCurrencies.main;
	$: secondCurrency = selectedSecondCurrency?.value || 'BTC';
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
