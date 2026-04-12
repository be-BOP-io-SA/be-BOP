<script lang="ts">
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';

	export let data;

	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const currenciesWithoutCrypto = currenciesToSelectOptions(
		sortedCurrencies.filter((c) => c !== 'BTC' && c !== 'SAT')
	);
	let selectedCurrency =
		currenciesWithoutCrypto.find((c) => c.value === data.taler.currency) || null;
	$: if (selectedCurrency) {
		data.taler.currency = selectedCurrency.value;
	}
</script>

<h1 class="text-3xl">Taler</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		Backend URL
		<input
			class="form-input"
			type="text"
			name="backendUrl"
			value={data.taler.backendUrl}
			required
		/>
	</label>

	<label class="form-label">
		Backend API Key
		<input
			class="form-input"
			type="password"
			name="backendApiKey"
			value={data.taler.backendApiKey}
			required
		/>
	</label>

	<label class="form-label">
		<CurrencyLabel label="Currency" />
		<Select
			items={currenciesWithoutCrypto}
			searchable={true}
			clearable={false}
			bind:value={selectedCurrency}
			class="form-input"
		/>
		<input type="hidden" name="currency" value={selectedCurrency?.value || ''} required />
	</label>

	<div class="flex justify-between">
		<button class="btn btn-black" type="submit">Save</button>
		<button class="btn btn-red" type="submit" form="delete-form">Reset</button>
	</div>
</form>
<form class="contents" method="post" action="?/delete" id="delete-form"></form>
