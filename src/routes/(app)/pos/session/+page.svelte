<script lang="ts">
	import { fetchEventSource } from '@microsoft/fetch-event-source';
	import Picture from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import CheckCircleOutlined from '~icons/ant-design/check-circle-outlined';
	import { onMount } from 'svelte';
	import { UNDERLYING_CURRENCY, type Currency } from '$lib/types/Currency.js';
	import { useI18n } from '$lib/i18n';
	import { orderRemainingToPay } from '$lib/types/Order.js';
	import Trans from '$lib/components/Trans.svelte';
	import { computePriceInfo } from '$lib/cart.js';

	interface CustomEventSource {
		onerror?: ((this: CustomEventSource, ev: Event) => unknown) | null;
		onmessage?: ((this: CustomEventSource, ev: MessageEvent) => unknown) | null;
		close?: () => void;
	}
	export let data;

	const ORDER_CLEAR_TIMEOUT = data.posDisplayOrderQrAfterPayment
		? data.posQrCodeAfterPayment.timeBeforeRedirecting * 1_000
		: 5_000;

	let eventSourceInstance: CustomEventSource | void | null = null;
	let formattedCart = data.formattedCart;
	let order = data.order;

	$: view =
		formattedCart && formattedCart.length > 0 ? 'updateCart' : order ? order.status : 'welcome';

	let currentTimeout = setTimeout(() => {
		if (order === data.order && order?.status !== 'pending') {
			order = null;
		}
	}, ORDER_CLEAR_TIMEOUT);

	async function subscribeToServerEvents() {
		eventSourceInstance = await fetchEventSource(`/pos/session/sse`, {
			onmessage(ev) {
				if (ev.data) {
					try {
						const { eventType, cart: sseCart, order: sseOrder } = JSON.parse(ev.data);
						if (eventType === 'cart') {
							formattedCart = sseCart;
						} else if (eventType === 'order') {
							order = sseOrder;
							clearTimeout(currentTimeout);
							currentTimeout = setTimeout(() => {
								if (order === sseOrder && order?.status !== 'pending') {
									order = null;
								}
							}, ORDER_CLEAR_TIMEOUT);
						}
					} catch (err) {
						console.error('=> SSE Error:', err);
					}
				}
			},
			onerror(err) {
				console.error('=> SSE Error:', err);
			}
			// Can set to true if you want tab to update even when hidden
			// openWhenHidden: true
		});
	}

	function cleanUpServerEvents() {
		if (eventSourceInstance) {
			eventSourceInstance?.close?.();
			eventSourceInstance = null;
		}
	}

	onMount(() => {
		subscribeToServerEvents();

		return () => {
			cleanUpServerEvents();
		};
	});
	$: priceConfig = {
		bebopCountry: data.vatCountry,
		deliveryFees: { amount: 0, currency: UNDERLYING_CURRENCY as Currency },
		freeProductUnits: {},
		userCountry: data.countryCode,
		vatExempted: data.vatExempted,
		vatNullOutsideSellerCountry: data.vatNullOutsideSellerCountry,
		vatSingleCountry: data.vatSingleCountry,
		vatProfiles: data.vatProfiles
	};
	$: priceInfo = computePriceInfo(formattedCart, priceConfig);

	const { t, locale, countryName } = useI18n();
</script>

<svelte:head>
	<meta name="viewport" content="width=500" />
</svelte:head>
<main class="fixed top-0 bottom-0 right-0 left-0 bg-white p-4">
	{#if view === 'updateCart'}
		{#if formattedCart.length}
			<div class="overflow-auto h-[90vh]">
				{#each formattedCart as item}
					{@const price = item.customPrice || item.product.price}
					<div class="flex items-center justify-between w-full">
						<div class="flex flex-col">
							<h2 class="text-sm text-gray-850">{item.quantity} x {item.product.name}</h2>
							<div class="flex gap-2">
								<div class="w-[60px] h-[60px] rounded flex items-center">
									{#if item.picture}
										<Picture
											picture={item.picture}
											class="mx-auto rounded h-full object-contain"
											sizes="60px"
										/>
									{/if}
								</div>
							</div>
						</div>

						<div class="flex flex-col items-end justify-center">
							<PriceTag
								amount={(item.quantity * price.amount * (item.depositPercentage ?? 100)) / 100}
								currency={price.currency}
								main
								class="text-2xl text-gray-800 truncate"
								>{item.depositPercentage
									? `(${(item.depositPercentage / 100).toLocaleString($locale, {
											style: 'percent'
									  })})`
									: ''}</PriceTag
							>
							<PriceTag
								class="text-base text-gray-600 truncate"
								amount={(item.quantity * price.amount * (item.depositPercentage ?? 100)) / 100}
								currency={price.currency}
								secondary
							/>
						</div>
					</div>
					<div class="border-b border-gray-300 col-span-4" />
				{/each}
			</div>
		{/if}
	{:else if view === 'pending'}
		{@const payment = order?.payments?.find((p) => p.status === 'pending')}
		{#if payment?.method === 'point-of-sale'}
			<div class="text-2xl text-center">{t('pos.session.waitingPaymentConfirmation')}</div>
		{:else if payment}
			<div class="flex flex-col items-center gap-3">
				<h1 class="text-3xl text-center">{t('order.singleTitle', { number: order?.number })}</h1>
				<img
					src="/order/{order?._id}/payment/{payment?.id}/qrcode?logo={!data.removeBebopLogoPOS}"
					alt="QR code"
					class="h-96 w-96"
				/>
			</div>
		{/if}
	{:else if view === 'canceled'}
		<div class="text-2xl text-center">{t('order.paymentStatus.canceledTemplate')}</div>
	{:else if view === 'expired'}
		<div class="text-2xl text-center">{t('order.paymentStatus.expiredTemplate')}</div>
	{:else if view === 'paid'}
		<div class="flex flex-col items-center gap-3">
			<h1 class="text-3xl text-center">{t('order.singleTitle', { number: order?.number })}</h1>
			<CheckCircleOutlined font-size="160" />
			{#if data.posDisplayOrderQrAfterPayment}
				<img
					src="/order/{order?._id}/qrcode?logo={!data.posQrCodeAfterPayment.removeBebobLogo}"
					alt="QR code"
					class="h-96 w-96"
				/>
				{#if data.posQrCodeAfterPayment.displayCustomerCta}
					<a href="/pos/session" on:click={() => (view = 'welcome')} class="btn btn-blue w-full"
						>{t('order.paymentDoneCustomerCTA')}</a
					>
				{/if}
			{/if}
		</div>
	{:else if view === 'welcome'}
		<div class="flex flex-col items-center">
			<h1 class="text-3xl">{t('pos.session.welcomeTitle')}</h1>
			<Picture class="" picture={data.logoPicture || undefined} />
			<h2 class="text-2xl">{t('pos.session.welcomeMessage')}</h2>
		</div>
	{/if}

	{#if order && view === 'pending'}
		{@const payment = order.payments.find((p) => p.status === 'pending')}
		{@const remainingAmount = orderRemainingToPay(order)}
		<div class="flex justify-between flex-col p-2 gap-2 bg-gray-300 fixed left-0 right-0 bottom-0">
			{#if payment}
				<div class="flex justify-between">
					<h3 class="text-gray-800 text-[28px]">{t('pos.pendingPayment')}:</h3>
					<div class="flex flex-col items-end">
						<PriceTag
							amount={payment?.price.amount || 0}
							currency={payment?.price.currency || UNDERLYING_CURRENCY}
							main
							class="text-[28px] text-gray-800"
						/>
						<PriceTag
							class="text-base text-gray-600"
							amount={payment?.price.amount || 0}
							currency={payment?.price.currency || UNDERLYING_CURRENCY}
							secondary
						/>
					</div>
				</div>
			{/if}
			<div class="flex justify-between">
				<h3 class="text-gray-800 text-[28px]">{t('order.restToPay')}:</h3>
				<div class="flex flex-col items-end">
					<PriceTag
						amount={remainingAmount}
						currency={order.totalPrice.currency || UNDERLYING_CURRENCY}
						main
						class="text-[28px] text-gray-800"
					/>
					<PriceTag
						class="text-base text-gray-600"
						amount={remainingAmount}
						currency={order.totalPrice.currency || UNDERLYING_CURRENCY}
						secondary
					/>
				</div>
			</div>
			<div class="flex justify-between">
				<h2 class="text-gray-800 text-[32px]">{t('cart.total')}:</h2>
				<div class="flex flex-col items-end">
					<PriceTag
						amount={order.currencySnapshot.main?.totalPrice.amount || 0}
						currency={order.currencySnapshot.main?.totalPrice.currency || UNDERLYING_CURRENCY}
						main
						class="text-[32px] text-gray-800"
					/>
					<PriceTag
						class="text-base text-gray-600"
						amount={order.currencySnapshot.secondary?.totalPrice.amount || 0}
						currency={order.currencySnapshot.secondary?.totalPrice.currency || UNDERLYING_CURRENCY}
						secondary
					/>
				</div>
			</div>
		</div>
	{:else if formattedCart && view === 'updateCart'}
		<div class="flex justify-between flex-col p-2 gap-2 bg-gray-300 fixed left-0 right-0 bottom-0">
			{#each priceInfo.vat as vat}
				<div class="flex justify-end border-b border-gray-300 gap-6">
					<div class="flex flex-col">
						<h2 class="text-gray-800 text-[28px]">Vat ({vat.rate}%):</h2>
						<p class="text-sm text-gray-600">
							{t('cart.vatRate', { country: countryName(vat.country) })}.
							{#if priceInfo.singleVatCountry}
								{t('cart.vatSellerCountry')}
							{:else}
								<Trans key="cart.vatIpCountry">
									<a href="https://lite.ip2location.com" slot="0"> https://lite.ip2location.com </a>
								</Trans>
							{/if}
						</p>
					</div>
					<div class="flex flex-col items-end">
						<PriceTag
							amount={vat.partialPrice.amount}
							currency={vat.partialPrice.currency}
							main
							class="text-[28px] text-gray-800"
						/>
						<PriceTag
							class="text-base text-gray-600"
							amount={vat.partialPrice.amount}
							currency={vat.partialPrice.currency}
							secondary
						/>
					</div>
				</div>
			{/each}

			<div class="flex justify-between">
				<h2 class="text-gray-800 text-[32px]">{t('cart.total')}:</h2>
				<div class="flex flex-col items-end">
					<PriceTag
						amount={priceInfo.partialPriceWithVat}
						currency={priceInfo.currency}
						main
						class="text-[32px] text-gray-800"
					/>
					<PriceTag
						class="text-base text-gray-600"
						amount={priceInfo.partialPriceWithVat}
						currency={priceInfo.currency}
						secondary
					/>
				</div>
			</div>
		</div>
	{/if}
</main>
