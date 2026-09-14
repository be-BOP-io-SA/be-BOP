<script lang="ts">
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;
	let backendChoice: 'lightning-pub' | 'processor' = data.backend;
</script>

<h1 class="text-3xl">CLINK</h1>

<p class="text-sm mb-4">
	Accept Lightning payments via the <strong>CLINK protocol</strong> (Common Lightning Interface for
	Nostr Keys). Customers use CLINK-aware wallets (ShockWallet, ZEUS, Amethyst, Dark Wisp) to scan an
	<code>nOffer</code> and pay via Nostr-encrypted messages — no bolt11 QR codes needed.
</p>

<p class="text-sm mb-4">
	You need an <code>noffer1...</code> string from a
	<a href="https://github.com/shocknet/Lightning.Pub" class="underline" target="_blank"
		>Lightning.Pub</a
	>
	node or another CLINK-compatible service. The nOffer tells CLINK wallets where to send payment requests.
</p>

<form class="contents" method="post" action="?/save">
	<h2 class="text-2xl mt-4">nOffer Configuration</h2>

	<label class="form-label">
		nOffer string
		<textarea
			class="form-input font-mono text-sm"
			name="nOffer"
			placeholder="noffer1qvq8w..."
			rows="3"
			value={data.nOffer}
		></textarea>
		<span class="text-xs text-gray-500"
			>Paste your noffer1... string from Lightning.Pub or similar</span
		>
	</label>

	<label class="form-label">
		Nostr relay URL
		<input
			class="form-input"
			type="url"
			name="relayUrl"
			placeholder="wss://strfry.shock.network"
			value={data.relayUrl}
		/>
		<span class="text-xs text-gray-500"
			>Relay where CLINK payment requests will be received (default: Shocknet relay)</span
		>
	</label>

	<h2 class="text-2xl mt-4">Lightning Backend</h2>

	<p class="text-sm mb-2">
		Choose which node creates and settles the CLINK bolt11 invoices. CLINK only transports the
		invoice to the customer over Nostr — the payment is always minted and settled by the backend you
		select here.
	</p>

	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={backendChoice}
			class="form-radio"
			name="backend"
			value="processor"
		/>
		<strong>be-BOP Lightning processor</strong> (LND, Phoenixd, Blink…) — invoices are minted and settled
		by the Lightning processor configured in your other admin pages.
	</label>

	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={backendChoice}
			class="form-radio"
			name="backend"
			value="lightning-pub"
		/>
		<strong>Lightning.Pub node</strong> — invoices are minted and settled by your own Lightning.Pub
		node through its HTTP API (the node that powers your <code>noffer1...</code>).
	</label>

	{#if backendChoice === 'lightning-pub'}
		<label class="form-label">
			Lightning.Pub endpoint
			<input
				class="form-input font-mono text-sm"
				type="url"
				name="lightningPubEndpoint"
				placeholder="https://..."
				value={data.lightningPubEndpoint}
			/>
			<span class="text-xs text-gray-500"
				>Base URL of your Lightning.Pub node's API (https). Required for the Lightning.Pub backend.</span
			>
		</label>

		<label class="form-label">
			Lightning.Pub token
			<input
				class="form-input font-mono text-sm"
				type="password"
				name="lightningPubToken"
				placeholder="pyro1..."
				value={data.lightningPubToken}
			/>
			<span class="text-xs text-gray-500"
				>The API token of the Lightning.Pub account tied to your nOffer.</span
			>
		</label>
	{/if}

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
	class="flex flex-col gap-2 mt-4"
>
	<button class="btn btn-blue self-start" type="submit" disabled={testDisabled}>
		{testInFlight ? 'Testing...' : 'Test connection'}
	</button>
	{#if form?.ok}
		<div class="alert-success">Connection successful. CLINK is properly configured.</div>
	{:else if form?.reason}
		<div class="alert-error">Connection failed: {form.reason}</div>
	{/if}
</form>

<p class="text-sm mb-4">
	Explore all <a href="https://clinkme.dev/apps.html" class="underline" target="_blank"
		>CLINK-aware wallets</a
	>
	available for mobile and desktop.
</p>

<h2 class="text-2xl mt-4">How It Works</h2>
<ol class="list-decimal list-inside text-sm mb-4">
	<li>
		Configure your nOffer string above (from any <a
			href="https://clinkme.dev/apps.html"
			class="underline"
			target="_blank">CLINK-aware wallet</a
		>)
	</li>
	<li>Save the configuration</li>
	<li>The wallet sends an encrypted payment request over Nostr</li>
	<li>be-BOP generates a BOLT11 invoice and responds</li>
	<li>The customer pays the invoice</li>
</ol>

<h2 class="text-2xl">Invoices</h2>

<SetLightningQrCodeDescription
	bind:invoiceDescription={data.lightningInvoiceDescription}
	bind:brandName={data.brandName}
	showThirdPartyWarning={true}
/>
