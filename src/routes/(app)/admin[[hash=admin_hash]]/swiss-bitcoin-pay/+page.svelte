<script lang="ts">
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	export let data;
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

<h2 class="text-2xl">Invoices</h2>

<SetLightningQrCodeDescription
	bind:invoiceDescription={data.lightningInvoiceDescription}
	bind:brandName={data.brandName}
	showThirdPartyWarning={true}
/>
