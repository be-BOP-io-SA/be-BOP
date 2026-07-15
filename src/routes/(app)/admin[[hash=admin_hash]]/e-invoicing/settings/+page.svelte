<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;

	const { countryName } = useI18n();
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
		<select name="platform" class="form-input">
			{#each data.platforms as platform}
				<option value={platform.id} selected={platform.id === data.eInvoicing.platform}>
					{platform.label}
				</option>
			{/each}
		</select>
		<p class="text-sm">
			Invoices are generated and stored locally. Transmission to an accredited platform (PDP) will
			be available once a platform adapter is configured.
		</p>
	</label>

	<div>
		<button type="submit" class="btn btn-black self-start">Update</button>
	</div>
</form>
