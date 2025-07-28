<script lang="ts">
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	export let data;
	let { serverUrl, storeId, apiKey } = data;

	$: accountSettingsUrl = serverUrl && `${serverUrl.replace(/\/\s*$/, '').trim()}/account/apikeys`;
	$: storeSettingsUrl =
		serverUrl &&
		storeId &&
		`${serverUrl.replace(/\/\s*$/, '').trim()}/stores/${storeId.trim()}/lightning/BTC/settings`;
</script>

<h1 class="text-3xl">BTCPay Server</h1>

<form class="contents" method="post" action="?/save">
	<label class="form-label">
		Server URL
		<input
			class="form-input"
			type="url"
			name="serverUrl"
			placeholder="e.g. https://mainnet.demo.btcpayserver.org"
			bind:value={serverUrl}
			required
		/>
	</label>
	<label class="form-label">
		Store ID
		<input
			class="form-input"
			type="text"
			name="storeId"
			placeholder="e.g. 7ceW79TUirU5J32KdWJh7VFzVcKqFCVDgBAk3vXjJrJQ"
			bind:value={storeId}
			required
		/>
	</label>
	{#if storeSettingsUrl}
		<div class="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
			<p class="text-yellow-800">
				Please make sure to enable lightning in
				<a
					href={storeSettingsUrl}
					class="body-hyperlink underline"
					target="_blank"
					rel="external noopener"
					aria-label="Lightning settings in your BTCPay Server store"
				>
					your store settings
				</a>.
				<br />If the link above does not work, check the provided Server URL and Store ID.
			</p>
		</div>
	{/if}
	<label class="form-label">
		API Key
		<input
			class="form-input"
			type="password"
			name="apiKey"
			placeholder="e.g. 5VBP0koD4gJB9L1zKUEbpUMi2cYyE3wxahHL3Vi6"
			bind:value={apiKey}
			required
		/>
		{#if accountSettingsUrl}
			<div class="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
				<p class="text-yellow-800">
					You can manage your API keys in
					<a
						href={accountSettingsUrl}
						class="body-hyperlink underline"
						target="_blank"
						rel="external noopener"
						aria-label="Lightning settings in your BTCPay Server store"
					>
						your account settings
					</a>.
					<br />Please make sure to include the <code>btcpay.store.cancreatelightninginvoice</code>
					and <code>btcpay.store.canviewlightninginvoice</code> permissions.
					<br />If the link above does not work, check the provided Server URL.
				</p>
			</div>
		{/if}
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
