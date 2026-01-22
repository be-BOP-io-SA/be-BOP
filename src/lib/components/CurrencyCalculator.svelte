<script lang="ts">
	import { sortCurrenciesDefault, type Currency } from '$lib/types/Currency';
	import { toCurrency } from '$lib/utils/toCurrency';
	import { currencies } from '$lib/stores/currencies';
	import { sellerIdentity } from '$lib/stores/sellerIdentity';
	import { getCurrencyFromCountry } from '$lib/types/Country';

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

	$: firstCurrencyAmount = 1;
	$: firstCurrency = $currencies.main;
	$: secondCurrency = getDefaultSecondCurrency(
		$currencies.main,
		$currencies.secondary,
		$sellerIdentity?.address?.country
	);
	$: secondCurrencyAmount = toCurrency(secondCurrency, firstCurrencyAmount, firstCurrency);
</script>

<div class="flex justify-center mx-auto max-w-3xl bg-gray-800 p-4 rounded-md">
	<div
		class="flex items-center bg-gray-900 text-white rounded-md focus-within:ring-2 focus-within:ring-blue-500 m-1"
	>
		<input
			type="number"
			class="form-input p-2 bg-transparent text-left text-white focus:outline-none"
			bind:value={firstCurrencyAmount}
			min="0"
		/>
		<select
			class="p-2 bg-gray-700 text-white border-l border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
			bind:value={firstCurrency}
		>
			{#each sortedCurrencies as currency}
				<option value={currency} selected={currency === firstCurrency}>{currency}</option>
			{/each}
		</select>
	</div>

	<span class="text-gray-400 text-3xl m-1">→</span>

	<div
		class="flex items-center bg-gray-900 text-white rounded-md focus-within:ring-2 focus-within:ring-blue-500 m-1"
	>
		<input
			type="text"
			class="form-input p-2 bg-transparent text-left text-white focus:outline-none"
			bind:value={secondCurrencyAmount}
			readonly
		/>
		<select
			class="p-2 bg-gray-700 text-white border-l border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
			bind:value={secondCurrency}
		>
			{#each sortedCurrencies as currency}
				<option value={currency} selected={currency === secondCurrency}>{currency}</option>
			{/each}
		</select>
	</div>
</div>
