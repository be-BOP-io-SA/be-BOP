<script lang="ts">
	import { page } from '$app/stores';
	import OrderSummary from '$lib/components/OrderSummary.svelte';

	export let data;

	$: returnTo = $page.url.searchParams.get('returnTo');
	$: orderPath = returnTo
		? `/order/${$page.params.id}?returnTo=${encodeURIComponent(returnTo)}`
		: `/order/${$page.params.id}`;
</script>

<main class="mx-auto max-w-7xl py-10 px-6 flex flex-col md:flex-row gap-4 justify-around">
	<div class="grow">
		{#if data.front && data.payData}
			<svelte:component this={data.front.PayForm} data={data.payData} {orderPath} />
		{/if}
	</div>
	<div class="self-center md:self-stretch">
		<OrderSummary class="sticky top-4 -mt-1" order={data.order} />
	</div>
</main>
