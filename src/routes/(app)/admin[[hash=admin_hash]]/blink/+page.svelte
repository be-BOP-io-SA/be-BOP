<script lang="ts">
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { enhance } from '$app/forms';
	import { useI18n } from '$lib/i18n';
	import Trans from '$lib/components/Trans.svelte';
	export let data;
	export let form;

	const { t } = useI18n();

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;
</script>

<h1 class="text-3xl">Blink</h1>

<p class="text-sm">
	<Trans key="admin.blink.intro">
		<strong slot="0" let:translation>{translation}</strong>
	</Trans>
</p>

<form class="contents" method="post" action="?/save">
	<h2 class="text-2xl">{t('admin.blink.option1Title')}</h2>
	<label class="form-label">
		{t('admin.blink.lnAddress')}
		<input
			class="form-input"
			type="text"
			name="lnAddress"
			placeholder="you@blink.sv"
			value={data.lnAddress}
		/>
	</label>

	<h2 class="text-2xl">{t('admin.blink.option2Title')}</h2>
	<label class="form-label">
		{t('admin.blink.apiKey')}
		<input
			class="form-input"
			type="password"
			name="apiKey"
			placeholder="blink_..."
			value={data.apiKey}
		/>
	</label>
	<label class="form-label">
		{t('admin.blink.walletId')}
		<input class="form-input" type="text" name="walletId" value={data.walletId} />
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
		<div class="alert-success">{t('admin.action.testSuccess', { provider: 'Blink' })}</div>
	{:else if form?.reason}
		<div class="alert-error">{t('admin.action.testFailed', { reason: form.reason })}</div>
	{/if}
</form>

<h2 class="text-2xl">{t('admin.blink.invoices')}</h2>

<SetLightningQrCodeDescription
	bind:invoiceDescription={data.lightningInvoiceDescription}
	bind:brandName={data.brandName}
	showThirdPartyWarning={true}
/>
