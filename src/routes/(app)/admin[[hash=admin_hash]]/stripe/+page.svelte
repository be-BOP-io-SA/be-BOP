<script lang="ts">
	import { sortCurrenciesDefault } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';

	export let data;

	// Stripe supports all fiat currencies (no BTC/SAT)
	// Sort: main → secondary → fiat A-Z (excluding crypto)
	const sortedCurrencies = sortCurrenciesDefault($currencies.main, $currencies.secondary);
	const currenciesWithoutCrypto = sortedCurrencies
		.filter((c) => c !== 'BTC' && c !== 'SAT')
		.map((c) => ({ value: c, label: c }));
	let selectedCurrency =
		currenciesWithoutCrypto.find((c) => c.value === data.stripe.currency) || null;
	$: if (selectedCurrency) {
		data.stripe.currency = selectedCurrency.value;
	}
</script>

<h1 class="text-3xl">Stripe</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		Secret Key
		<input
			class="form-input"
			type="password"
			name="secretKey"
			value={data.stripe.secretKey}
			placeholder="sk_..."
			required
		/>
	</label>

	<label class="form-label">
		Public Key
		<input
			class="form-input"
			type="text"
			name="publicKey"
			value={data.stripe.publicKey}
			placeholder="pk_..."
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
