<script lang="ts">
	import { enhance } from '$app/forms';
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import type { ComponentType } from 'svelte';

	export let data;
	export let form;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;

	/**
	 * One hand-written component per processor, found by name. The fields differ far too much
	 * to generate — a crypto-filtered currency picker, a merchant-code hint, a two-mode
	 * explainer, deep links rebuilt as the operator types — while everything around them
	 * differs not at all. So the markup stays written by hand and only the scaffolding is
	 * shared.
	 */
	const fieldComponents = import.meta.glob('/src/lib/components/psp-forms/*.svelte', {
		eager: true
	}) as Record<string, { default: ComponentType }>;

	$: Fields = fieldComponents[`/src/lib/components/psp-forms/${data.slug}.svelte`]?.default;
</script>

<h1 class="text-3xl">{data.label}</h1>

<form class="contents" method="post" action="?/save">
	<svelte:component this={Fields} bind:config={data.config} />

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
			// 10s debounce to throttle accidental hammering on top of the server-side rateLimit.
			testCooldownUntil = Date.now() + 10_000;
		};
	}}
	class="flex flex-col gap-2"
>
	<button class="btn btn-blue self-start" type="submit" disabled={testDisabled}>
		{testInFlight ? 'Testing…' : 'Test connection'}
	</button>
	{#if form?.ok}
		<div class="alert-success">Connection successful. {data.label} credentials are working.</div>
	{:else if form?.reason}
		<div class="alert-error">Connection failed: {form.reason}</div>
	{/if}
</form>

{#if data.method === 'lightning'}
	<h2 class="text-2xl">Invoices</h2>

	<SetLightningQrCodeDescription
		bind:invoiceDescription={data.lightningInvoiceDescription}
		bind:brandName={data.brandName}
		showThirdPartyWarning={true}
	/>
{/if}
