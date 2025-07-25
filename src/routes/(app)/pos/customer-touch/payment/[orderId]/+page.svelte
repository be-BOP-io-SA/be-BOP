<script lang="ts">
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import { useI18n } from '$lib/i18n';
	import { bitcoinPaymentQrCodeString, lightningPaymentQrCodeString } from '$lib/types/Order';
	import IconSumupWide from '$lib/components/icons/IconSumupWide.svelte';
	import IconStripe from '$lib/components/icons/IconStripe.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { UrlDependency } from '$lib/types/UrlDependency.js';
	export let data;

	const { t } = useI18n();
	let timeoutId: ReturnType<typeof setInterval>;

	onMount(() => {
		timeoutId = setInterval(() => {
			if (data.order.status === 'paid') {
				window.location.assign(`/pos/customer-touch/order/${data.order._id}`);
			}
			invalidate(UrlDependency.Order);
		}, 1000);
	});
	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});
</script>

<div class="mx-auto max-w-7xl flex flex-col items-center justify-center p-2">
	<button
		class="self-start text-gray-800 font-semibold text-lg flex items-center"
		on:click={() => history.back()}
	>
		<IconBack />
		{t('customerTouch.ctaBack')}
	</button>

	{#if data.order.status === 'pending'}
		<h1 class="text-4xl font-bold text-gray-900 mb-10 text-center leading-tight">
			{t('customerTouch.payForOrderTitle')}
		</h1>
		{#each data.order.payments as payment}
			{#if payment.status === 'pending'}
				{#if payment.method === 'lightning'}
					<a href={lightningPaymentQrCodeString(payment.address ?? '')}>
						<img
							src="/order/{data.order._id}/payment/{payment.id}/qrcode"
							class="w-96 h-96"
							alt="QR code"
						/></a
					>
				{/if}
				{#if payment.method === 'card'}
					<a
						href="/order/{data.order._id}/payment/{payment.id}/pay?origin=customer-touch"
						class="body-hyperlink"
					>
						<span>{t('order.paymentLink')}</span>
						{#if payment.processor === 'sumup'}
							<IconSumupWide class="h-12 " />
						{:else if payment.processor === 'stripe'}
							<IconStripe class="h-12" />
						{:else if payment.processor === 'paypal'}
							<img
								src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_200x51.png"
								alt="PayPal"
								class="h-12"
							/>
						{/if}
					</a>
					<img
						src="/order/{data.order._id}/payment/{payment.id}/qrcode"
						class="w-96 h-96"
						alt="QR code"
					/>
				{/if}
				{#if payment.method === 'bitcoin' && payment.address}
					<span class="body-hyperlink font-light italic">{t('order.clickQR')}</span>
					<a
						href={bitcoinPaymentQrCodeString(
							payment.address,
							payment.price.amount,
							payment.price.currency
						)}
					>
						<img
							src="/order/{data.order._id}/payment/{payment.id}/qrcode"
							class="w-96 h-96"
							alt="QR code"
						/>
					</a>
				{/if}
			{/if}
		{/each}
		<div class="w-full grid grid-cols-[min-content_auto] gap-4">
			<button
				on:click={() => goto('/pos/customer-touch/list/drop')}
				class="bg-[#2f2f32] text-white flex justify-center text-xl font-semibold rounded-lg p-4"
			>
				{t('customerTouch.cta.abandonment')}
			</button>

			<button
				class="bg-gray-100 flex justify-center text-xl font-semibold rounded-lg p-4 border border-gray-200 shadow-md"
			>
				Ask for help
			</button>
		</div>
	{:else if data.order.status === 'paid'}
		<h1 class="text-3xl mt-4">{t('customerTouch.orderPaidTitle')}☺️!</h1>
		<p>
			<a href="/pos/customer-touch/order/{data.order._id}" class="underline text-blue-600"
				>{t('customerTouch.clickRedirect')}</a
			>
		</p>
	{:else}
		<h1 class="text-3xl mt-4">{t('customerTouch.orderPaymentFailedTitle')}😞!</h1>
		<p></p>
	{/if}
</div>
