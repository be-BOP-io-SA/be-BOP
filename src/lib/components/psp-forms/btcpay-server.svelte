<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let config: { serverUrl: string; storeId: string; apiKey: string };

	const { t } = useI18n();

	// Deep links into the operator's own BTCPay instance, rebuilt as they type, so the two
	// settings they have to get right are one click away rather than described in prose.
	$: base = config.serverUrl && config.serverUrl.replace(/\/\s*$/, '').trim();
	$: accountSettingsUrl = base && `${base}/account/apikeys`;
	$: storeSettingsUrl =
		base && config.storeId && `${base}/stores/${config.storeId.trim()}/lightning/BTC/settings`;
</script>

<label class="form-label">
	{t('admin.btcpayServer.serverUrl')}
	<input
		class="form-input"
		type="url"
		name="serverUrl"
		placeholder={t('admin.btcpayServer.serverUrlPlaceholder')}
		bind:value={config.serverUrl}
		required
	/>
</label>
<label class="form-label">
	{t('admin.btcpayServer.storeId')}
	<input
		class="form-input"
		type="text"
		name="storeId"
		placeholder={t('admin.btcpayServer.storeIdPlaceholder')}
		bind:value={config.storeId}
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
		placeholder={t('admin.btcpayServer.apiKeyPlaceholder')}
		bind:value={config.apiKey}
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
