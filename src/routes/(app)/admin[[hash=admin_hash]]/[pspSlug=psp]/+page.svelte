<script lang="ts">
	import { enhance } from '$app/forms';
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import type { ComponentType } from 'svelte';
	import { useI18n } from '$lib/i18n';
	import ConfigForm from '$lib/payment-processors/ConfigForm.svelte';
	import { PROCESSORS } from '$lib/types/paymentProcessors';

	export let data;
	export let form;

	const { t } = useI18n();

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;

	// A processor with its own folder declares its fields; the others still have a form here.
	const fieldComponents = import.meta.glob('/src/lib/components/psp-forms/*.svelte', {
		eager: true
	}) as Record<string, { default: ComponentType }>;

	$: Fields = fieldComponents[`/src/lib/components/psp-forms/${data.slug}.svelte`]?.default;
	$: declaration = PROCESSORS[data.slug];
	$: fields = 'config' in declaration ? declaration.config.fields : undefined;
</script>

<h1 class="text-3xl">{data.label}</h1>

<form class="contents" method="post" action="?/save">
	{#if fields && data.front?.settings}
		<ConfigForm {fields} texts={data.front.settings.fields} config={data.config} />
	{:else}
		<svelte:component this={Fields} bind:config={data.config} />
	{/if}

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
		{testInFlight ? t('admin.action.testing') : t('admin.action.testConnection')}
	</button>
	{#if form?.ok}
		<div class="alert-success">{t('admin.action.testSuccess', { provider: data.label })}</div>
	{:else if form?.reason}
		<div class="alert-error">{t('admin.action.testFailed', { reason: form.reason })}</div>
	{/if}
</form>

{#if data.method === 'lightning'}
	<h2 class="text-2xl">{t('admin.paymentProcessor.invoices')}</h2>

	<SetLightningQrCodeDescription
		bind:invoiceDescription={data.lightningInvoiceDescription}
		bind:brandName={data.brandName}
		showThirdPartyWarning={true}
	/>
{/if}
