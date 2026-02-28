<script lang="ts">
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';

	export let data;

	// PayPal supports all fiat currencies (no BTC/SAT)
	// Sort: main → secondary → fiat A-Z (excluding crypto)
	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const currenciesWithoutCrypto = currenciesToSelectOptions(
		sortedCurrencies.filter((c) => c !== 'BTC' && c !== 'SAT')
	);
	let selectedCurrency =
		currenciesWithoutCrypto.find((c) => c.value === data.paypal.currency) || null;
	$: if (selectedCurrency) {
		data.paypal.currency = selectedCurrency.value;
	}
</script>

<h1 class="text-3xl">Paypal</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		Client ID
		<input class="form-input" type="text" name="clientId" value={data.paypal.clientId} required />
	</label>

	<label class="form-label">
		Secret
		<input class="form-input" type="password" name="secret" value={data.paypal.secret} required />
	</label>

	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="sandbox"
			bind:checked={data.paypal.sandbox}
			value="true"
		/>
		Those credentials are for the sandbox environment
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
