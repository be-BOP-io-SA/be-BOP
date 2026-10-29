<script lang="ts">
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import Select from 'svelte-select';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';

	export let data;
	export let form;

	const { t } = useI18n();

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;

	// Stripe supports all fiat currencies (no BTC/SAT)
	// Sort: main → secondary → fiat A-Z (excluding crypto)
	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const currenciesWithoutCrypto = currenciesToSelectOptions(
		sortedCurrencies.filter((c) => c !== 'BTC' && c !== 'SAT')
	);
	let selectedCurrency =
		currenciesWithoutCrypto.find((c) => c.value === data.stripe.currency) || null;
	$: if (selectedCurrency) {
		data.stripe.currency = selectedCurrency.value;
	}
</script>

<h1 class="text-3xl">Stripe</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		{t('admin.stripe.secretKey')}
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
		{t('admin.stripe.publicKey')}
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
		<CurrencyLabel label={t('admin.stripe.currency')} />
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
			// 10s debounce to throttle accidental hammering on top of the server-side rateLimit.
			testCooldownUntil = Date.now() + 10_000;
		};
	}}
	class="flex flex-col gap-2"
>
	<button class="btn btn-blue self-start" type="submit" disabled={testDisabled}>
		{testInFlight ? t('admin.stripe.testing') : t('admin.stripe.testConnection')}
	</button>
	{#if form?.ok}
		<div class="alert-success">{t('admin.stripe.testSuccess')}</div>
	{:else if form?.reason}
		<div class="alert-error">{t('admin.stripe.testFailed', { reason: form.reason })}</div>
	{/if}
</form>
