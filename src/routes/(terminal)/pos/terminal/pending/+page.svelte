<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import CancelPayment from '../payment/[id]/CancelPayment.svelte';

	export let data;

	const { t, locale } = useI18n();
</script>

<main class="min-h-screen flex flex-col items-center gap-4 p-4 body-mainPlan">
	<h1 class="text-2xl">{t('pos.terminal.pendingPayments')}</h1>
	{#each data.pending as pending (pending.id)}
		<div class="flex flex-col gap-2 w-full max-w-sm">
			<!-- No way back into a payment that is not canceled: the only way out is to cancel it. -->
			<div
				class="flex justify-between items-center text-lg py-3 px-4 rounded bg-white text-black border border-gray-300"
			>
				<span class="flex flex-col items-start">
					<span>#{pending.number}{pending.externalRef ? ` · ${pending.externalRef}` : ''}</span>
					<span class="text-sm opacity-70"
						>{pending.method === 'card'
							? t('pos.terminal.methodCardStripe')
							: t(`checkout.paymentMethod.${pending.method}`)} · {new Date(
							pending.createdAt
						).toLocaleTimeString($locale)}</span
					>
				</span>
				<PriceTag inline amount={pending.price.amount} currency={pending.price.currency} />
			</div>
			{#if data.canCancel}
				<CancelPayment action="/pos/terminal/payment/{pending.id}?/cancel" />
			{/if}
		</div>
	{:else}
		<p>{t('pos.terminal.noPendingPayments')}</p>
	{/each}
	<a href="/pos/terminal" class="btn body-mainCTA w-full max-w-sm text-xl py-4"
		>{t('pos.terminal.back')}</a
	>
</main>
