<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { bitcoinPaymentQrCodeString } from '$lib/types/Order';
	import { invalidate } from '$app/navigation';
	import { onDestroy, onMount } from 'svelte';
	import { UrlDependency } from '$lib/types/UrlDependency.js';
	import { enhance } from '$app/forms';

	export let data;

	const { t } = useI18n();
	let timeoutId: ReturnType<typeof setInterval>;
	let helpRequestState: 'idle' | 'loading' | 'success' = 'idle';

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
	{#if data.order.status === 'pending'}
		<h1 class="text-4xl font-bold text-gray-900 mb-10 text-center leading-tight">
			{t('customerTouch.payForOrderTitle')}
		</h1>
		{#each data.order.payments as payment}
			{#if payment.status === 'pending'}
				<p class="text-xl font-semibold mb-4">
					{t('customerTouch.payment.chosenMethod')}: {t(`checkout.paymentMethod.${payment.method}`)}
				</p>
				{#if payment.method === 'lightning'}
					<img
						src="/order/{data.order._id}/payment/{payment.id}/qrcode"
						class="w-96 h-96"
						alt="QR code"
					/>
				{/if}
				{#if payment.method === 'card'}
					<img
						src="/order/{data.order._id}/payment/{payment.id}/qrcode"
						class="w-96 h-96"
						alt="QR code"
					/>
				{/if}
				{#if payment.method === 'bitcoin' && payment.address}
					<img
						src="/order/{data.order._id}/payment/{payment.id}/qrcode"
						class="w-96 h-96"
						alt="QR code"
					/>
				{/if}
			{/if}
		{/each}
		<div class="w-full grid grid-cols-[min-content_auto] gap-4 mt-4">
			<form method="POST" action="?/abandon">
				<button
					type="submit"
					class="bg-[#2f2f32] text-white flex justify-center text-xl font-semibold rounded-lg p-4 whitespace-nowrap"
				>
					{t('customerTouch.cta.abandonment')}
				</button>
			</form>

			{#if data.helpRequestNpub}
				<form
					method="POST"
					action="?/requestHelp"
					use:enhance={() => {
						helpRequestState = 'loading';
						return async ({ update }) => {
							await update();
							helpRequestState = 'success';
						};
					}}
				>
					<button
						type="submit"
						disabled={helpRequestState !== 'idle'}
						class="bg-gray-100 flex justify-center items-center gap-2 text-xl font-semibold rounded-lg p-4 border border-gray-200 shadow-md w-full disabled:opacity-70"
					>
						{#if helpRequestState === 'success'}
							<span class="text-green-600">✓</span>
							{t('customerTouch.helpRequest.someoneComing')}
						{:else if helpRequestState === 'loading'}
							{t('customerTouch.helpRequest.sending')}
						{:else}
							{t('customerTouch.helpRequest.askForHelp')}
						{/if}
					</button>
				</form>
			{:else}
				<button
					class="bg-gray-100 flex justify-center text-xl font-semibold rounded-lg p-4 border border-gray-200 shadow-md opacity-50 cursor-not-allowed"
					disabled
				>
					{t('customerTouch.helpRequest.askForHelp')}
				</button>
			{/if}
		</div>
	{:else if data.order.status === 'paid'}
		<h1 class="text-3xl mt-4">{t('customerTouch.orderPaidTitle')}!</h1>
		<p>
			<a href="/pos/customer-touch/order/{data.order._id}" class="underline text-blue-600"
				>{t('customerTouch.clickRedirect')}</a
			>
		</p>
	{:else}
		<h1 class="text-3xl mt-4">{t('customerTouch.orderPaymentFailedTitle')}!</h1>
		<a
			href="/pos/customer-touch/list/home"
			class="mt-4 bg-[#8fd16a] text-black text-xl font-semibold rounded-lg px-6 py-3"
		>
			{t('customerTouch.nav.home')}
		</a>
	{/if}
</div>
