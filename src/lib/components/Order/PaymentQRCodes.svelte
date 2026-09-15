<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let hideCreditCardQrCode: boolean | undefined = undefined;

	$: presentation = payment.presentation;
	$: qrUrl = `${$page.url.pathname}/payment/${payment.id}/qrcode`;
	// The card QR is the one a shop can choose to hide on the terminal.
	$: showQr = presentation?.kind === 'qr' && !(payment.method === 'card' && hideCreditCardQrCode);
</script>

<svelte:head>
	{#if payment.status === 'pending'}
		{#each presentation?.headTags ?? [] as tag}
			<meta name={tag.name} content={tag.content} />
		{/each}
	{/if}
</svelte:head>

{#if payment.status === 'pending'}
	{#if showQr}
		{#if presentation?.qrLink}
			<a href={presentation.qrLink}>
				<img src={qrUrl} class="w-96 h-96" alt="QR code" />
			</a>
		{:else}
			<img src={qrUrl} class="w-96 h-96" alt="QR code" />
		{/if}
		{#if payment.method === 'bitcoin'}
			<p class="text-sm text-gray-600">
				{t('order.clickQR')}
			</p>
		{/if}
	{/if}

	{#if presentation?.kind === 'redirect' && payment.method === 'osb' && payment.address}
		<a href={payment.address} class="btn btn-primary" target="_blank" rel="noopener">
			{t('checkout.paymentMethod.osb')}
		</a>
	{/if}

	<!-- Payment instruction text -->
	{#if payment.method !== 'point-of-sale'}
		<div class="payment-instruction">
			{#if payment.method === 'bitcoin' && payment.awaitingConfirmation}
				<p class="text-green-600">
					{t('order.awaitingConfirmationBitcoin', { count: payment.confirmationBlocksRequired })}
				</p>
			{:else}
				<p>{t('order.payToComplete')}</p>
				{#if payment.method === 'bitcoin'}
					<p>{t('order.payToCompleteBitcoin', { count: payment.confirmationBlocksRequired })}</p>
				{/if}
			{/if}
		</div>
	{/if}
{/if}
