<script lang="ts">
	export let config: { serverUrl: string; storeId: string; apiKey: string };

	// Deep links into the operator's own BTCPay instance, rebuilt as they type, so the two
	// settings they have to get right are one click away rather than described in prose.
	$: base = config.serverUrl && config.serverUrl.replace(/\/\s*$/, '').trim();
	$: accountSettingsUrl = base && `${base}/account/apikeys`;
	$: storeSettingsUrl =
		base && config.storeId && `${base}/stores/${config.storeId.trim()}/lightning/BTC/settings`;
</script>

<label class="form-label">
	Server URL
	<input
		class="form-input"
		type="url"
		name="serverUrl"
		placeholder="e.g. https://mainnet.demo.btcpayserver.org"
		bind:value={config.serverUrl}
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
		bind:value={config.storeId}
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
		bind:value={config.apiKey}
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
