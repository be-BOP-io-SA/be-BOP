<script lang="ts">
	import PictureComponent from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import type { Picture } from '$lib/types/Picture';
	import type { Product } from '$lib/types/Product';

	export let picture: Picture;
	export let product: Pick<Product, '_id' | 'price' | 'name'>;
</script>

<a href="/pos/customer-touch/list/product/{product._id}" class="rounded-xl w-full items-center mx-auto">
	<div class="relative w-full h-40">
		<PictureComponent {picture} class="object-cover w-full h-full rounded-xl shadow-md" />
		<span class="absolute top-2 right-2 bg-white text-black px-2 rounded-lg">
			<PriceTag amount={product.price.amount} currency={product.price.currency} main />
		</span>
	</div>
	<p class="mt-4 text-center px-1 text-xs break-words break-all">
		{product.name.toUpperCase()}
	</p>
</a>
