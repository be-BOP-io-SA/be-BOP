<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let invoiceDescription: 'orderUrl' | 'brand' | 'brandAndOrderNumber' | 'none';
	export let brandName: string;
	export let showThirdPartyWarning: boolean;

	const { t } = useI18n();
</script>

<p>
	{t('admin.lightningQrCode.description')}
</p>

{#if showThirdPartyWarning}
	<div class="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
		<p class="text-yellow-800">
			<strong>{t('admin.lightningQrCode.warningLabel')}</strong>
			{t('admin.lightningQrCode.thirdPartyWarning')}
		</p>
	</div>
{/if}

<form method="POST" action="?/updateLightningInvoiceDescription">
	<label class="checkbox-label">
		<input
			type="radio"
			name="qrCodeDescription"
			value="none"
			class="form-radio"
			bind:group={invoiceDescription}
		/>
		{t('admin.lightningQrCode.noExtraInfo')}
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			name="qrCodeDescription"
			value="brand"
			class="form-radio"
			bind:group={invoiceDescription}
		/>
		{t('admin.lightningQrCode.brandAddedToQrCode', { brandName })}
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			name="qrCodeDescription"
			value="brandAndOrderNumber"
			class="form-radio"
			bind:group={invoiceDescription}
		/>
		{t('admin.lightningQrCode.brandAndOrderNumberAddedToQrCode', { brandName })}
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			name="qrCodeDescription"
			value="orderUrl"
			class="form-radio"
			bind:group={invoiceDescription}
		/>
		{t('admin.lightningQrCode.orderUrlAddedToQrCode')}
	</label>

	<button type="submit" class="btn btn-black mt-2">{t('admin.action.update')}</button>
</form>
