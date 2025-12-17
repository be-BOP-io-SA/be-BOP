<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { page } from '$app/stores';
	import { lightningPaymentQrCodeString } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let hideCreditCardQrCode: boolean | undefined = undefined;
</script>

{#if payment.status === 'pending'}
	<!-- Lightning QR -->
	{#if payment.method === 'lightning'}
		<a href={lightningPaymentQrCodeString(payment.address ?? '')}>
			<img src="{$page.url.pathname}/payment/{payment.id}/qrcode" class="w-96 h-96" alt="QR code" />
		</a>
	{/if}

	<!-- Card QR (if not hidden) -->
	{#if payment.method === 'card' && !hideCreditCardQrCode}
		<img src="{$page.url.pathname}/payment/{payment.id}/qrcode" class="w-96 h-96" alt="QR code" />
	{/if}

	<!-- Bitcoin QR -->
	{#if payment.method === 'bitcoin'}
		<a href="bitcoin:{payment.address}?amount={payment.currencySnapshot?.main?.price?.amount}">
			<img src="{$page.url.pathname}/payment/{payment.id}/qrcode" class="w-96 h-96" alt="QR code" />
		</a>
		<p class="text-sm text-gray-600">
			{t('order.clickQR')}
		</p>
	{/if}

	<!-- Payment instruction text -->
	{#if payment.method !== 'point-of-sale'}
		<div class="payment-instruction">
			<p>{t('order.payToComplete')}</p>
			{#if payment.method === 'bitcoin'}
				<p>{t('order.payToCompleteBitcoin', { count: payment.confirmationBlocksRequired })}</p>
			{/if}
		</div>
	{/if}
{/if}
