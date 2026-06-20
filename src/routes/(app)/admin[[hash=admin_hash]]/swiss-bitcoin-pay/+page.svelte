<script lang="ts">
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;
</script>

<h1 class="text-3xl">Swiss Bitcoin Pay</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		API Key
		<input class="form-input" type="password" name="apiKey" value={data.apiKey} required />
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
		<div class="alert-success">
			Connection successful. Swiss Bitcoin Pay credentials are working.
		</div>
	{:else if form?.reason}
		<div class="alert-error">Connection failed: {form.reason}</div>
	{/if}
</form>

<h2 class="text-2xl">Invoices</h2>

<SetLightningQrCodeDescription
	bind:invoiceDescription={data.lightningInvoiceDescription}
	bind:brandName={data.brandName}
	showThirdPartyWarning={true}
/>
