<script lang="ts">
	import { goto } from '$app/navigation';
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import IconBitcoinOrange from '$lib/components/icons/IconBitcoinOrange.svelte';
	import IconCreditCard from '$lib/components/icons/IconCreditCard.svelte';
	import IconPaypal from '$lib/components/icons/IconPaypal.svelte';
	import { useI18n } from '$lib/i18n';
	import IconCash from './IconCash.svelte';
	import IconLightning from './IconLightning.svelte';
	const { t } = useI18n();
	let paymentMethod = 'cash';
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
			<button
				on:click={() => (paymentMethod = 'card')}
				class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-4 shadow-sm hover:bg-gray-200 transition-colors duration-200"
			>
				<IconCreditCard />
				{t('checkout.paymentMethod.card')}
			</button>

			<button
				on:click={() => (paymentMethod = 'paypal')}
				class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-4 shadow-sm hover:bg-gray-200 transition-colors duration-200"
				><IconPaypal />
				<span>{t('checkout.paymentMethod.paypal')}</span>
			</button>

			<button
				on:click={() => (paymentMethod = 'bitcoin')}
				class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-2 shadow-sm hover:bg-gray-200 transition-colors duration-200"
			>
				<IconBitcoinOrange />
				<span>{t('checkout.paymentMethod.bitcoin')}</span>
			</button>

			<button
				on:click={() => (paymentMethod = 'lightning')}
				class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-2 shadow-sm hover:bg-gray-200 transition-colors duration-200"
			>
				<IconLightning />
				<span>{t('checkout.paymentMethod.lightning')}</span>
			</button>

			<button
				on:click={() => (paymentMethod = 'point-of-sale')}
				class="w-full px-6 py-4 bg-gray-100 border border-gray-400 rounded-lg text-xl flex items-center justify-center gap-2 shadow-sm hover:bg-gray-200 transition-colors duration-200"
			>
				<IconCash />
				{t('checkout.paymentMethod.cash')}
			</button>
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
