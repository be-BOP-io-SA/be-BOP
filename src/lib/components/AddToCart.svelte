<script lang="ts">
	import type { Product } from '$lib/types/Product';
	import type { Picture } from '$lib/types/Picture';
	import Popup from './Popup.svelte';
	import { productAddedToCart } from '$lib/stores/productAddedToCart';
	import ProductAddedToCart from './ProductAddedToCart.svelte';
	import { applyAction, enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { UrlDependency } from '$lib/types/UrlDependency';
	import { useI18n } from '$lib/i18n';
	import { page } from '$app/stores';

	let loading = false;
	export let picture: Picture | undefined;
	export let product: Pick<
		Product,
		| '_id'
		| 'name'
		| 'price'
		| 'shortDescription'
		| 'preorder'
		| 'availableDate'
		| 'shipping'
		| 'type'
		| 'stock'
		| 'hasSellDisclaimer'
	>;
	const widget = {};

	function addToCart() {
		$productAddedToCart = {
			product,
			quantity: 1,
			picture,
			widget
		};
	}
	let className = '';
	export { className as class };
	export let detailBtn = false;
	export let btnTranslationKey = 'product.cta.add';
	const { t } = useI18n();
	let hasStock = !!(product.stock?.available ?? Infinity);
</script>

<form
	method="post"
	class="contents"
	use:enhance={() => {
		loading = true;
		return async ({ result }) => {
			loading = false;
			if (result.type === 'error') {
				return await applyAction(result);
			}

			await invalidate(UrlDependency.Cart);
			addToCart();
			// Not for the widget, see https://github.com/B2Bitcoin/B2BitcoinBootik/issues/243
			//document.body.scrollIntoView();
		};
	}}
>
	{#if hasStock && !product.hasSellDisclaimer}
		<button
			type="submit"
			disabled={loading}
			formaction="/product/{product._id}?/addToCart"
			class={className}
		>
			{t(btnTranslationKey)}
		</button>
	{/if}
	{#if detailBtn}
		<a
			href="/product/{product._id}"
			class="btn cartPreview-secondaryCTA text-xl text-center w-full md:w-[150px] p-1"
		>
			{t('product.cta.details')}
		</a>
	{/if}
	{#if $productAddedToCart && $productAddedToCart.widget === widget}
		<Popup>
			<ProductAddedToCart
				class="w-[562px] max-w-full"
				on:dismiss={() => ($productAddedToCart = null)}
				product={$productAddedToCart.product}
				picture={$productAddedToCart.picture}
				customPrice={$productAddedToCart.customPrice}
				chosenVariations={$productAddedToCart.chosenVariations}
				depositPercentage={$productAddedToCart.depositPercentage}
				discountPercentage={$productAddedToCart.discountPercentage}
				priceMultiplier={$productAddedToCart.priceMultiplier}
				removePopinProductPrice={$page.data.removePopinProductPrice}
			/>
		</Popup>
	{/if}
</form>
