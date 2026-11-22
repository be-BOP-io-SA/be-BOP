<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';

	export let data;

	const { t, locale } = useI18n();
</script>

<main class="flex-1 flex flex-col items-center gap-4 p-4 body-mainPlan">
	<h1 class="text-2xl">{t('pos.terminal.paidPayments')}</h1>
	{#each data.paid as paid (paid.id)}
		<a
			href="/pos/terminal/payment/{paid.id}"
			class="btn pos-secondary w-full max-w-sm flex justify-between items-center text-lg py-3"
		>
			<span class="flex flex-col items-start">
				<span>#{paid.number}{paid.externalRef ? ` · ${paid.externalRef}` : ''}</span>
				<span class="text-sm opacity-70"
					>{paid.method === 'card'
						? t('pos.terminal.methodCardStripe')
						: t(`checkout.paymentMethod.${paid.method}`)} · {new Date(
						paid.createdAt
					).toLocaleString($locale)}</span
				>
			</span>
			<PriceTag inline amount={paid.price.amount} currency={paid.price.currency} />
		</a>
	{:else}
		<p>{t('pos.terminal.noPaidPayments')}</p>
	{/each}
</main>
