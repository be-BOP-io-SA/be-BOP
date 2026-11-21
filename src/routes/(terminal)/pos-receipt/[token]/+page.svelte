<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';

	export let data;

	const { t, locale } = useI18n();
</script>

<main class="max-w-md mx-auto p-4 flex flex-col gap-3 body-mainPlan">
	<h1 class="text-2xl font-semibold">{t('pos.receipt.title')}</h1>
	<p class="text-sm opacity-70">{t('pos.receipt.customerCopy')}</p>

	<section>
		<p class="font-semibold">{data.seller.name}</p>
		{#if data.seller.address}
			<p class="text-sm">
				{data.seller.address.street}, {data.seller.address.zip}
				{data.seller.address.city}
			</p>
		{/if}
		{#if data.seller.vatNumber}
			<p class="text-sm">{t('pos.receipt.vatNumber', { number: data.seller.vatNumber })}</p>
		{/if}
	</section>

	{#if data.status !== 'paid'}
		<p class="text-red-600">{t('pos.receipt.notPaid')}</p>
	{/if}

	<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
		<dt>{t('pos.receipt.number')}</dt>
		<dd>#{data.number}</dd>
		<dt>{t('pos.receipt.date')}</dt>
		<dd>{new Date(data.at).toLocaleString($locale)}</dd>
		<dt>{t('pos.receipt.type')}</dt>
		<dd>{t('pos.receipt.payment')}</dd>
		<dt>{t('pos.receipt.sale')}</dt>
		<dd><PriceTag inline amount={data.amount.amount} currency={data.amount.currency} /></dd>
		<dt>{t('pos.receipt.tip')}</dt>
		<dd><PriceTag inline amount={data.tip.amount} currency={data.tip.currency} /></dd>
		<dt class="font-semibold">{t('pos.receipt.total')}</dt>
		<dd class="font-semibold">
			<PriceTag inline amount={data.total.amount} currency={data.total.currency} />
		</dd>
		<dt>{t('pos.receipt.method')}</dt>
		<dd>{t(`checkout.paymentMethod.${data.method}`)} · {data.processor}</dd>
		{#if data.transactionId}
			<dt>{t('pos.receipt.transactionId')}</dt>
			<dd class="break-all font-mono text-xs">{data.transactionId}</dd>
		{/if}
		<dt>{t('pos.receipt.sats')}</dt>
		<dd>
			{data.sats.toLocaleString($locale)} sats
			{#if data.rate}
				· {t('pos.receipt.rate')}
				<PriceTag inline amount={data.rate.amount} currency={data.rate.currency} />
			{/if}
		</dd>
		<dt>{t('pos.receipt.ref')}</dt>
		<dd>{data.externalRef ?? t('pos.receipt.noRef')}</dd>
		<dt>{t('pos.receipt.device')}</dt>
		<dd>{data.device}</dd>
		{#if data.operator}
			<dt>{t('pos.receipt.operator')}</dt>
			<dd>{data.operator}</dd>
		{/if}
	</dl>
</main>
