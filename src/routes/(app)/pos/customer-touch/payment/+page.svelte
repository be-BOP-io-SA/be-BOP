<script lang="ts">
	import { goto } from '$app/navigation';
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import IconBitcoinOrange from '$lib/components/icons/IconBitcoinOrange.svelte';
	import IconCreditCard from '$lib/components/icons/IconCreditCard.svelte';
	import IconPaypal from '$lib/components/icons/IconPaypal.svelte';
	import { useI18n } from '$lib/i18n';
	import IconLightning from './IconLightning.svelte';

	export let data;

	const { t } = useI18n();
	let paymentMethod = data.isFreeOrder ? 'free' : 'lightning';

	$: availableMethods = data.paymentMethods;
</script>

<div class="mx-auto max-w-7xl p-2">
	<button
		class="self-start font-semibold text-lg flex items-center"
		on:click={() => history.back()}
	>
		<IconBack />
		{t('customerTouch.ctaBack')}
	</button>
	<div class="flex flex-col items-center justify-center">
		<h1 class="text-4xl font-bold text-gray-900 mb-10 text-center leading-tight">
			{t('customerTouch.payment.Title')}
		</h1>

		<form method="post" class="w-full flex flex-col gap-4">
			<input type="hidden" name="paymentMethod" bind:value={paymentMethod} />

			{#if data.isFreeOrder}
				<button
					type="submit"
					class="w-full px-6 py-4 bg-green-100 border border-green-400 rounded-lg text-xl flex items-center justify-center gap-4 shadow-sm hover:bg-green-200 transition-colors duration-200"
				>
					<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					{t('checkout.paymentMethod.free')}
				</button>
			{:else}
				{#if availableMethods.includes('card')}
					<button
						on:click={() => (paymentMethod = 'card')}
						class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-4 shadow-sm hover:bg-gray-200 transition-colors duration-200"
					>
						<IconCreditCard />
						{t('checkout.paymentMethod.card')}
					</button>
				{/if}

				{#if availableMethods.includes('paypal')}
					<button
						on:click={() => (paymentMethod = 'paypal')}
						class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-4 shadow-sm hover:bg-gray-200 transition-colors duration-200"
					>
						<IconPaypal />
						<span>{t('checkout.paymentMethod.paypal')}</span>
					</button>
				{/if}

				{#if availableMethods.includes('bitcoin')}
					<button
						on:click={() => (paymentMethod = 'bitcoin')}
						class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-2 shadow-sm hover:bg-gray-200 transition-colors duration-200"
					>
						<IconBitcoinOrange />
						<span>{t('checkout.paymentMethod.bitcoin')}</span>
					</button>
				{/if}

				{#if availableMethods.includes('lightning')}
					<button
						on:click={() => (paymentMethod = 'lightning')}
						class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-2 shadow-sm hover:bg-gray-200 transition-colors duration-200"
					>
						<IconLightning />
						<span>{t('checkout.paymentMethod.lightning')}</span>
					</button>
				{/if}
			{/if}
		</form>
	</div>

	<div class="w-full flex gap-4 py-4">
		<button
			type="button"
			on:click={() => goto('/pos/customer-touch/list/drop')}
			class="flex-1 bg-[#2f2f32] text-white font-semibold py-2 rounded-lg shadow-md"
		>
			{t('customerTouch.cta.abandonment')}
		</button>
		<button
			type="button"
			on:click={() => goto('/pos/customer-touch/list/home')}
			class="flex-1 bg-gray-100 text-gray-900 font-semibold py-2 rounded-lg border border-gray-400 shadow-md"
		>
			{t('customerTouch.cta.retakeOrder')}
		</button>
	</div>
</div>
