<script lang="ts">
	import SetLightningQrCodeDescription from '$lib/components/SetLightningQrCodeDescription.svelte';
	import { useI18n } from '$lib/i18n';
	const { t } = useI18n();
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
		{t('admin.btcpayServer.serverUrl')}
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
		{t('admin.btcpayServer.storeId')}
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
				{t('admin.btcpayServer.lightningWarningPrefix')}
				<a
					href={storeSettingsUrl}
					class="body-hyperlink underline"
					target="_blank"
					rel="external noopener"
					aria-label={t('admin.btcpayServer.ariaLightningSettings')}
				>
					{t('admin.btcpayServer.storeSettingsLink')}
				</a>.
				<br />{t('admin.btcpayServer.lightningLinkFallbackStore')}
			</p>
		</div>
	{/if}
	<label class="form-label">
		{t('admin.btcpayServer.apiKey')}
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
					{t('admin.btcpayServer.apiKeyManagePrefix')}
					<a
						href={accountSettingsUrl}
						class="body-hyperlink underline"
						target="_blank"
						rel="external noopener"
						aria-label={t('admin.btcpayServer.ariaLightningSettings')}
					>
						{t('admin.btcpayServer.accountSettingsLink')}
					</a>.
					<br />{t('admin.btcpayServer.apiKeyPermissionsPrefix')}
					<code>btcpay.store.cancreatelightninginvoice</code>
					{t('admin.btcpayServer.apiKeyPermissionsMiddle')}
					<code>btcpay.store.canviewlightninginvoice</code>
					{t('admin.btcpayServer.apiKeyPermissionsSuffix')}
					<br />{t('admin.btcpayServer.apiKeyLinkFallback')}
				</p>
			</div>
		{/if}
	</label>

	<div class="flex justify-between">
		<button class="btn btn-black" type="submit">{t('admin.action.save')}</button>
		<button class="btn btn-red" type="submit" form="delete-form">{t('admin.action.reset')}</button>
	</div>
</form>
<form class="contents" method="post" action="?/delete" id="delete-form"></form>

<h2 class="text-2xl">{t('admin.btcpayServer.invoices')}</h2>

<SetLightningQrCodeDescription
	bind:invoiceDescription={data.lightningInvoiceDescription}
	bind:brandName={data.brandName}
	showThirdPartyWarning={true}
/>
