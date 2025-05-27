<script lang="ts">
	import { productAddedToCart } from '$lib/stores/productAddedToCart';
	import type { Picture } from '$lib/types/Picture';
	import type { Product } from '$lib/types/Product';
	import PictureComponent from '../Picture.svelte';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { UrlDependency } from '$lib/types/UrlDependency';

	export let pictures: Picture[] | [];
	export let product: Pick<Product, 'name' | '_id' | 'price' | 'stock'>;
	let loading = false;
	let className = '';
	export { className as class };
	const widget = {};
	function addToCart() {
		$productAddedToCart = {
			product,
			quantity: 1,
			picture: pictures[0],
			widget
		};
	}
	let hasStock = !!(product.stock?.available ?? Infinity);
</script>

<form
	method="post"
	class="contents"
	action="/product/{product._id}?/addToCart"
	use:enhance={() => {
		loading = true;
		return async ({ result }) => {
			loading = false;
			if (result.type === 'error') {
				alert(result.error.message);
				return;
			}

			await invalidate(UrlDependency.Cart);
			addToCart();
		};
	}}
>
	<button type="submit" disabled={!hasStock || loading}>
		<div class="touchScreen-product-cta flex flex-row {className} max-h-[4em]">
			<div>
				<PictureComponent
					picture={pictures[0]}
					class="object-contain h-24 w-24"
					style="object-fit: cover;"
				/>
			</div>
			<div class="p-3 flex items-start text-left">
				<h2 class="text-3xl break-all break-words">{product.name}</h2>
			</div>
		</div>
	</button>
</form>
