<script lang="ts">
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;
</script>

<h1 class="text-3xl">Blink</h1>

<p class="text-sm">
	Receive Lightning payments into your Blink account. Configure <strong>one</strong> of the two options
	below. A Lightning address needs no API key and works for both custodial Blink accounts and self-custodial
	(Spark) addresses. Only BTC wallets are supported.
</p>

<form class="contents" method="post" action="?/save">
	<h2 class="text-2xl">Option 1 — Lightning address (no API key)</h2>
	<label class="form-label">
		Lightning address
		<input
			class="form-input"
			type="text"
			name="lnAddress"
			placeholder="you@blink.sv"
			value={data.lnAddress}
		/>
	</label>

	<h2 class="text-2xl">Option 2 — API key (custodial account)</h2>
	<label class="form-label">
		API Key
		<input
			class="form-input"
			type="password"
			name="apiKey"
			placeholder="blink_..."
			value={data.apiKey}
		/>
	</label>
	<label class="form-label">
		Wallet ID (optional — defaults to your account's default BTC wallet)
		<input class="form-input" type="text" name="walletId" value={data.walletId} />
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
		<div class="alert-success">Connection successful. Blink credentials are working.</div>
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
