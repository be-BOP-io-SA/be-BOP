<script lang="ts">
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { enhance } from '$app/forms';

	export let data;
	export let form;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;

	// SumUp supports all fiat currencies (no BTC/SAT)
	// Sort: main → secondary → fiat A-Z (excluding crypto)
	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const currenciesWithoutCrypto = currenciesToSelectOptions(
		sortedCurrencies.filter((c) => c !== 'BTC' && c !== 'SAT')
	);
	let selectedCurrency =
		currenciesWithoutCrypto.find((c) => c.value === data.sumUp.currency) || null;
	$: if (selectedCurrency) {
		data.sumUp.currency = selectedCurrency.value;
	}
</script>

<h1 class="text-3xl">SumUp</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		API Key
		<input
			class="form-input"
			type="password"
			name="apiKey"
			value={data.sumUp.apiKey}
			placeholder="sup_sk_..."
			required
		/>
	</label>

	<label class="form-label">
		Merchant Code
		<input
			class="form-input"
			type="text"
			name="merchantCode"
			value={data.sumUp.merchantCode}
			placeholder="MXXXXXX"
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

<form
	method="post"
	action="?/testConnection"
	use:enhance={() => {
		testInFlight = true;
		return async ({ update }) => {
			await update({ reset: false });
			testInFlight = false;
			testCooldownUntil = Date.now() + 10_000;
		};
	}}
	class="flex flex-col gap-2"
>
	<button class="btn btn-blue self-start" type="submit" disabled={testDisabled}>
		{testInFlight ? 'Testing…' : 'Test connection'}
	</button>
	{#if form?.ok}
		<div class="alert-success">Connection successful. SumUp credentials are working.</div>
	{:else if form?.reason}
		<div class="alert-error">Connection failed: {form.reason}</div>
	{/if}
</form>
