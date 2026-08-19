<script lang="ts">
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	export let form;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;

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
		{t('admin.paypal.clientId')}
		<input class="form-input" type="text" name="clientId" value={data.paypal.clientId} required />
	</label>

	<label class="form-label">
		{t('admin.paypal.secret')}
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
		{t('admin.paypal.sandboxCredentials')}
	</label>

	<label class="form-label">
		<CurrencyLabel label={t('admin.paypal.currency')} />
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
		<button class="btn btn-black" type="submit">{t('admin.action.save')}</button>
		<button class="btn btn-red" type="submit" form="delete-form">{t('admin.action.reset')}</button>
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
		{testInFlight ? t('admin.action.testing') : t('admin.action.testConnection')}
	</button>
	{#if form?.ok}
		<div class="alert-success">{t('admin.action.testSuccess', { provider: 'PayPal' })}</div>
	{:else if form?.reason}
		<div class="alert-error">{t('admin.action.testFailed', { reason: form.reason })}</div>
	{/if}
</form>
