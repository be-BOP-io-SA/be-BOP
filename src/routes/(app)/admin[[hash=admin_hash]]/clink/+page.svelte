<script lang="ts">
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;

	let showToken = false;
</script>

<h1 class="text-3xl">CLINK</h1>

<p class="text-sm mb-4">
	Accept Lightning payments via the <strong>CLINK protocol</strong> (Common Lightning Interface for Nostr
	Keys). Customers use CLINK-aware wallets (ShockWallet, ZEUS, Amethyst, Dark Wisp) to scan an
	<code>nOffer</code> and pay via Nostr-encrypted messages — no bolt11 QR codes needed.
</p>

<p class="text-sm mb-4">
	You need an <code>noffer1...</code> string from a <a
		href="https://github.com/shocknet/Lightning.Pub"
		class="underline"
		target="_blank">Lightning.Pub</a
	>
	node or another CLINK-compatible service. The nOffer tells CLINK wallets where to send payment
	requests.
</p>

<form class="contents" method="post" action="?/save">
	<label class="form-label flex items-center gap-2">
		<input
			class="form-checkbox"
			type="checkbox"
			name="enabled"
			checked={data.enabled}
		/>
		Enable CLINK payments
	</label>

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
			placeholder="wss://relay.shocknet.app"
			value={data.relayUrl}
		/>
		<span class="text-xs text-gray-500"
			>Relay where CLINK payment requests will be received (default: Shocknet relay)</span
		>
	</label>

	<h2 class="text-2xl mt-4">Lightning Backend (Optional)</h2>

	<p class="text-sm mb-2">
		By default, CLINK uses your configured default lightning processor (LND, Blink, PhoenixD,
		etc.) for invoice generation. Alternatively, you can point to a Lightning.Pub HTTP endpoint
		directly.
	</p>

	<label class="form-label">
		Lightning.Pub endpoint URL
		<input
			class="form-input"
			type="url"
			name="lightningPubEndpoint"
			placeholder="http://localhost:1776"
			value={data.lightningPubEndpoint}
		/>
		<span class="text-xs text-gray-500"
			>Leave empty to use the default lightning processor</span
		>
	</label>

	<label class="form-label">
		Lightning.Pub auth token
		<div class="relative">
			<input
				class="form-input pr-10"
				type={showToken ? 'text' : 'password'}
				name="lightningPubToken"
				placeholder="Bearer token..."
				value={data.lightningPubToken}
			/>
			<button
				type="button"
				class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
				on:click={() => (showToken = !showToken)}
			>
				{showToken ? '🙈' : '👁️'}
			</button>
		</div>
		<span class="text-xs text-gray-500"
			>Only needed if using a Lightning.Pub HTTP endpoint</span
		>
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
	class="flex flex-col gap-2 mt-4"
>
	<button class="btn btn-blue self-start" type="submit" disabled={testDisabled}>
		{testInFlight ? 'Testing...' : 'Test connection'}
	</button>
	{#if form?.ok}
		<div class="alert-success">
			Connection successful. CLINK is properly configured.
		</div>
	{:else if form?.reason}
		<div class="alert-error">Connection failed: {form.reason}</div>
	{/if}
</form>

<p class="text-sm mb-4">
	Explore all <a href="https://clinkme.dev/apps.html" class="underline" target="_blank">CLINK-aware wallets</a>
	available for mobile and desktop.
</p>

<h2 class="text-2xl mt-4">How It Works</h2>
<ol class="list-decimal list-inside text-sm mb-4">
	<li>Configure your nOffer string above (from any <a href="https://clinkme.dev/apps.html" class="underline" target="_blank">CLINK-aware wallet</a>)</li>
	<li>Enable CLINK and save</li>
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
