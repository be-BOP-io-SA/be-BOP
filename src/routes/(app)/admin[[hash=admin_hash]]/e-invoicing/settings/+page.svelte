<script lang="ts">
	import { useI18n } from '$lib/i18n.js';
	import { enhance } from '$app/forms';

	export let data;
	export let form;

	const { countryName } = useI18n();

	let selectedPlatform = data.eInvoicing.platform;

	let testInFlight = false;
	let testCooldownUntil = 0;
	$: testDisabled = testInFlight || Date.now() < testCooldownUntil;
</script>

<h1 class="text-3xl">E-invoicing settings</h1>

{#if data.warnings.missingSellerIdentity}
	<p class="text-red-600">
		No seller identity configured — set it up in
		<a href="{data.adminPrefix}/identity" class="underline">Identity</a> before enabling e-invoicing.
	</p>
{:else}
	{#if data.warnings.missingSiret}
		<p class="text-orange-600">
			The seller identity has no SIRET — French e-invoices need one, add it in
			<a href="{data.adminPrefix}/identity" class="underline">Identity</a>.
		</p>
	{/if}
	{#if data.warnings.missingVatNumber}
		<p class="text-orange-600">
			The seller identity has no VAT number — add it in
			<a href="{data.adminPrefix}/identity" class="underline">Identity</a>.
		</p>
	{/if}
{/if}
{#if data.warnings.noFiatCurrency}
	<p class="text-red-600">
		No fiat currency configured (main, secondary or accounting) — e-invoices must be expressed in a
		fiat currency, configure one in <a href="{data.adminPrefix}/config" class="underline">Config</a
		>.
	</p>
{/if}

<form class="contents" method="post" action="?/update">
	<label class="checkbox-label">
		<input type="checkbox" name="enabled" class="form-checkbox" checked={data.eInvoicing.enabled} />
		Enable e-invoicing (generate a structured e-invoice for every paid payment)
	</label>

	<label class="form-label max-w-[25rem]">
		Country
		<select name="country" class="form-input">
			{#each data.countries as country}
				<option value={country} selected={country === data.eInvoicing.country}>
					{countryName(country)} (Factur-X)
				</option>
			{/each}
		</select>
		<p class="text-sm">Only France is available for now; other EU countries will plug in here.</p>
	</label>

	<label class="form-label max-w-[25rem]">
		Transmission platform
		<select name="platform" class="form-input" bind:value={selectedPlatform}>
			{#each data.platforms as platform}
				<option value={platform.id}>
					{platform.label}
				</option>
			{/each}
		</select>
		<p class="text-sm">
			Invoices are generated and stored locally. To transmit them, select a platform adapter here
			and configure its connection below.
		</p>
	</label>

	<div>
		<button type="submit" class="btn btn-black self-start">Update</button>
	</div>
</form>

{#if selectedPlatform === 'openapi'}
	<h2 class="text-2xl">OpenAPI PDP connection</h2>

	<p class="text-sm">
		Connect to any accredited platform (PDP) exposing the common French e-invoicing OpenAPI shape
		(OAuth2 client_credentials + `{'{apiVersion}'}/invoices`) — e.g. SUPER PDP's sandbox at
		<code>https://api.superpdp.tech</code> with API version <code>v1.beta</code>.
	</p>

	<form class="contents" method="post" action="?/saveConnection" autocomplete="off">
		<label class="form-label max-w-[25rem]">
			Base URL
			<input
				class="form-input"
				type="url"
				name="baseUrl"
				placeholder="https://api.superpdp.tech"
				value={data.openApiPdp.baseUrl}
				autocomplete="off"
				required
			/>
		</label>

		<label class="form-label max-w-[25rem]">
			API path
			<input
				class="form-input"
				type="text"
				name="apiVersion"
				placeholder="/v1.beta"
				value={data.openApiPdp.apiVersion}
				autocomplete="off"
				required
			/>
			<p class="text-sm">
				Subfolder appended to the base URL, e.g. "/v1.beta" or "v1" (leading/trailing slashes are
				optional, either form works).
			</p>
		</label>

		<label class="form-label max-w-[25rem]">
			Client ID
			<input
				class="form-input"
				type="text"
				name="clientId"
				value={data.openApiPdp.clientId}
				autocomplete="off"
				required
			/>
		</label>

		<label class="form-label max-w-[25rem]">
			Client secret
			<input
				class="form-input"
				type="password"
				name="clientSecret"
				value={data.openApiPdp.clientSecret}
				autocomplete="new-password"
				required
			/>
		</label>

		<div class="flex justify-between max-w-[25rem]">
			<button class="btn btn-black" type="submit">Save</button>
			<button class="btn btn-red" type="submit" form="delete-connection-form">Reset</button>
		</div>
	</form>
	<form
		class="contents"
		method="post"
		action="?/deleteConnection"
		id="delete-connection-form"
	></form>

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
			<div class="alert-success">Connection successful. PDP credentials are working.</div>
		{:else if form?.reason}
			<div class="alert-error">Connection failed: {form.reason}</div>
		{/if}
	</form>
{/if}
