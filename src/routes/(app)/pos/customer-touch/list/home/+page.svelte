<script lang="ts">
	import PictureComponent from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';

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
				<a
					href="/pos/customer-touch/list/{product._id}"
					class="rounded-xl w-full items-center mx-auto"
				>
					<div class="relative w-full h-40">
						<PictureComponent
							picture={picturesByProduct[product._id]}
							class="object-cover w-full h-full rounded-xl shadow-md"
						/>
						<span class="absolute top-2 right-2 bg-white text-black px-2 rounded-lg">
							<PriceTag amount={product.price.amount} currency={product.price.currency} main />
						</span>
					</div>
					<p class="mt-4 text-center px-1 text-xs break-words break-all">
						{product.name.toUpperCase()}
					</p>
				</a>
			{/each}
		</div>
	</div>
</main>
