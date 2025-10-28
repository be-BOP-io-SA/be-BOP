<script lang="ts">
	import ProductItem from '$lib/components/ProductItem.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import { useI18n } from '$lib/i18n';

	const { t, locale } = useI18n();

	export let data;
</script>

<main class="mx-auto max-w-7xl py-10 px-6 flex flex-col gap-4 items-start">
	<h1 class="text-3xl">
		{t('subscription.singleTitle', { number: data.subscription.number })}
	</h1>

	<ProductItem product={data.product} picture={data.picture} />

	{#if data.subscription.npub || data.subscription.email}
		<div class="flex flex-col gap-1">
			<p class="font-semibold">{t('subscription.associated.title')}</p>
			{#if data.subscription.npub}
				<p class="ml-4">npub: {data.subscription.npub}</p>
			{/if}
			{#if data.subscription.email}
				<p class="ml-4">email: {data.subscription.email}</p>
			{/if}
		</div>
	{/if}

	<p>
		<Trans key="subscription.initiallyCreated"
			><time datetime={data.subscription.createdAt.toJSON()} slot="0"
				>{new Date(data.subscription.createdAt).toLocaleString($locale)}</time
			></Trans
		>
	</p>

	<p>
		<Trans key="subscription.paidUntil"
			><time datetime={data.subscription.paidUntil.toJSON()} slot="0"
				>{new Date(data.subscription.paidUntil).toLocaleString($locale)}</time
			></Trans
		>
		{#if data.subscription.paidUntil < new Date()}
			<span class="text-red-500">({t('subscription.status.expired')})</span>
		{/if}
	</p>

	<form action="?/renew" method="post">
		<button
			class="btn btn-black"
			disabled={!data.canRenew}
			title={data.canRenew ? '' : t('subscription.cantRenew')}>{t('subscription.cta.renew')}</button
		>
	</form>
</main>
