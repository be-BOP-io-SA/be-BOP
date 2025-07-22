<script lang="ts">
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import { useI18n } from '$lib/i18n';
	import PictureComponent from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let data;
	const { t } = useI18n();
	let timeoutId: ReturnType<typeof setInterval>;
	let receiptSent = $page.url.searchParams.get('receiptSent') === 'true';
	let displayRecipientSent = receiptSent;
	onMount(() => {
		timeoutId = setTimeout(() => {
			goto('/pos/customer-touch/welcome');
		}, 30000);
	});
	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});
	let receiptIFrame: Record<string, HTMLIFrameElement | null> = Object.fromEntries(
		data.order.payments.map((payment) => [payment.id, null])
	);
	let receiptReady: Record<string, boolean> = Object.fromEntries(
		data.order.payments.map((payment) => [payment.id, false])
	);
</script>

<div class="mx-auto max-w-7xl flex flex-col items-center justify-center p-2">
	<button class="self-start font-bold text-xl flex items-center" on:click={() => history.back()}>
		<IconBack />
		{t('customerTouch.ctaBack')}
	</button>
	<div class="bg-[#f8f8f8] rounded-xl p-6 w-full shadow-lg mt-4 mb-8">
		<h1 class="text-3xl font-bold mb-6">
			{t('customerTouch.orderConfirmedTitle', { number: data.order.number })}
		</h1>

		<div class="flex flex-col gap-4 px-2">
			{#each data.order.items as item}
				<div class="flex items-center gap-4">
					<div class="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
						<PictureComponent
							picture={item.picture}
							class="object-cover-full rounded-lg"
							sizes="50px"
						/>
					</div>
					<div class="flex-1">
						<p class="text-xl">
							{item.product.name} <span class="font-normal">{item.quantity}x</span>
						</p>
						<PriceTag
							class="text-base"
							amount={item.quantity *
								(item.currencySnapshot.main.customPrice?.amount ??
									item.currencySnapshot.main.price.amount)}
							currency={item.currencySnapshot.main.customPrice?.currency ??
								item.currencySnapshot.main.price.currency}
						/>
					</div>
				</div>
			{/each}
		</div>

		<hr class="border-gray-200 my-6" />

		<div class="">
			<p class="text-xl font-bold">{t('customer-touch.cart.totalTTC')}</p>
			<PriceTag
				class="text-4xl font-bold"
				amount={data.order.currencySnapshot.main.totalPrice.amount}
				currency={data.order.currencySnapshot.main.totalPrice.currency}
			/>
		</div>
	</div>

	<div class="w-full flex flex-col items-center">
		<h2 class="text-2xl font-bold mb-6 text-center">{t('customerTouch.orderTitle')}</h2>

		<div class="w-full grid grid-cols-3 justify-center gap-4">
			<a
				href="/pos/customer-touch/welcome"
				class="flex justify-center items-center bg-[#f47c8c] text-white font-bold py-4 rounded-lg text-xl shadow-md"
			>
				{t('customerTouch.noThanksCta')}
			</a>
			{#if displayRecipientSent}
				<button
					class="flex justify-center items-center border-[#8fd16a] border-[2px] font-bold py-4 rounded-lg text-xl shadow-md"
					on:click={() => (displayRecipientSent = false)}
				>
					{t('customerTouch.receipt.sent')} ✅
				</button>
			{:else}
				<a
					href="{$page.url.pathname}/send-receipt"
					class="flex justify-center items-center bg-[#8fd16a] font-bold py-4 rounded-lg text-xl shadow-md"
				>
					{t('customerTouch.sendTicketCta')}
				</a>
			{/if}
			<button
				type="button"
				disabled={!data.order.payments[0].id}
				on:click={() => receiptIFrame[data.order.payments[0].id]?.contentWindow?.print()}
				class="flex justify-center items-center bg-[#8fd16a] font-bold py-4 rounded-lg text-xl shadow-md"
			>
				{t('customerTouch.printCta')}
			</button>
			<iframe
				src={`/order/${data.order._id}/payment/${data.order.payments[0].id}/ticket`}
				style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
				title=""
				on:load={() => (receiptReady = { ...receiptReady, [data.order.payments[0].id]: true })}
				bind:this={receiptIFrame[data.order.payments[0].id]}
			/>
		</div>
	</div>
</div>
