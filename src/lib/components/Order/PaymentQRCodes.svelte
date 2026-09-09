<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { page } from '$app/stores';
	import { lightningPaymentQrCodeString } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let hideCreditCardQrCode: boolean | undefined = undefined;

	$: isClink = payment.processor === 'clink';
	let nOfferCopied = false;

	function copyNOffer() {
		if (payment.address) {
			navigator.clipboard.writeText(payment.address);
			nOfferCopied = true;
			setTimeout(() => (nOfferCopied = false), 2000);
		}
	}
</script>

<!-- Taler wallet browser extension auto-detects payments via this meta tag -->
<svelte:head>
	{#if payment.status === 'pending' && payment.method === 'taler' && payment.address}
		<meta name="taler-support" content={payment.address} />
	{/if}
</svelte:head>

{#if payment.status === 'pending'}
	<!-- CLINK Lightning QR (nOffer) -->
	{#if payment.method === 'lightning' && isClink}
		<div class="clink-payment">
			<div class="qr-container">
				<img
					src="{$page.url.pathname}/payment/{payment.id}/qrcode"
					class="w-96 h-96"
					alt="CLINK QR code"
				/>
			</div>
			<p class="clink-instruction">
				Scan this QR code with a
				<a href="https://clinkme.dev/apps.html" target="_blank" rel="noopener" class="underline">
					CLINK-compatible wallet
				</a>
			</p>
			{#if payment.address}
				<button
					on:click={copyNOffer}
					class="text-xs text-gray-500 hover:text-gray-700 mt-1 font-mono break-all bg-transparent border-0 p-0 cursor-pointer"
					title="Copy nOffer"
				>
					{nOfferCopied ? 'Copied!' : payment.address.slice(0, 40) + '...'}
				</button>
			{/if}
		</div>
	{:else if payment.method === 'lightning'}
		<!-- Standard Lightning QR (bolt11) -->
		<a href={lightningPaymentQrCodeString(payment.address ?? '')}>
			<img
				src="{$page.url.pathname}/payment/{payment.id}/qrcode"
				class="w-96 h-96"
				alt="QR code"
			/>
		</a>
	{/if}

	<!-- Taler QR -->
	{#if payment.method === 'taler'}
		<a href={payment.address ?? ''}>
			<img
				src="{$page.url.pathname}/payment/{payment.id}/qrcode"
				class="w-96 h-96"
				alt="QR code"
			/>
		</a>
	{/if}

	<!-- OSB redirect link -->
	{#if payment.method === 'osb' && payment.address}
		<a href={payment.address} class="btn btn-primary" target="_blank" rel="noopener">
			{t('checkout.paymentMethod.osb')}
		</a>
	{/if}

	<!-- Card QR (if not hidden) -->
	{#if payment.method === 'card' && !hideCreditCardQrCode}
		<img
			src="{$page.url.pathname}/payment/{payment.id}/qrcode"
			class="w-96 h-96"
			alt="QR code"
		/>
	{/if}

	<!-- Bitcoin QR -->
	{#if payment.method === 'bitcoin'}
		<a href="bitcoin:{payment.address}?amount={payment.currencySnapshot?.main?.price?.amount}">
			<img
				src="{$page.url.pathname}/payment/{payment.id}/qrcode"
				class="w-96 h-96"
				alt="QR code"
			/>
		</a>
		<p class="text-sm text-gray-600">
			{t('order.clickQR')}
		</p>
	{/if}

	<!-- Payment instruction text -->
	{#if payment.method !== 'point-of-sale' && !isClink}
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

<style>
	.clink-payment {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	.qr-container {
		border: 1px solid var(--color-gray-200, #e5e7eb);
		border-radius: 0.75rem;
		padding: 0.5rem;
		background: white;
	}
	.clink-instruction {
		text-align: center;
		font-size: 0.95rem;
		color: var(--color-gray-600, #4b5563);
		max-width: 24rem;
	}
</style>
