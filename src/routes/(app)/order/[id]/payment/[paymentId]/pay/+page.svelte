<script lang="ts">
	import { page } from '$app/stores';
	import OrderSummary from '$lib/components/OrderSummary.svelte';
	import { PAYMENT_RETURN_PARAM } from '$lib/types/Order';

	export let data;

	$: returnTo = $page.url.searchParams.get('returnTo');
	// Back on the order page, the buyer waits for this payment to be confirmed.
	$: orderPath = `/order/${$page.params.id}?${new URLSearchParams({
		[PAYMENT_RETURN_PARAM]: data.payment.id,
		...(returnTo && { returnTo })
	})}`;
</script>

<main class="mx-auto max-w-7xl py-10 px-6 flex flex-col md:flex-row gap-4 justify-around">
	<div class="grow">
		{#if data.front && data.payData}
			<svelte:component this={data.front.component} view="pay" data={data.payData} {orderPath} />
		{/if}
	</div>
	<div class="self-center md:self-stretch">
		<OrderSummary class="sticky top-4 -mt-1" order={data.order} />
	</div>
</main>
