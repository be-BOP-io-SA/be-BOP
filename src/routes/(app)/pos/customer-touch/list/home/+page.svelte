<script lang="ts">
	import CustomerTouchProduct from '$lib/components/CustomerTouchProduct.svelte';

	export let data;
	$: picturesByProduct = Object.fromEntries(
		[...data.pictures].reverse().map((picture) => [picture.productId, picture])
	);
</script>

<main class="flex flex-col bg-gray-100 border rounded-lg">
	<div class="p-2 text-center">
		<h2 class="text-3xl font-bold text-gray-900 mb-4">CMS content / Searchlist</h2>
		<div class="grid grid-cols-3 gap-2 h-[90vh] overflow-scroll">
			{#each data.products as product}
				<CustomerTouchProduct {product} picture={picturesByProduct[product._id]} />
			{/each}
		</div>
	</div>
</main>
