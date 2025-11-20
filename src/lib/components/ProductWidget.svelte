<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import ProductWidgetVariation1 from './ProductWidget/ProductWidgetVariation1.svelte';
	import ProductWidgetVariation2 from './ProductWidget/ProductWidgetVariation2.svelte';
	import ProductWidgetVariation3 from './ProductWidget/ProductWidgetVariation3.svelte';
	import ProductWidgetVariation4 from './ProductWidget/ProductWidgetVariation4.svelte';
	import ProductWidgetVariation5 from './ProductWidget/ProductWidgetVariation5.svelte';
	import ProductWidgetVariation6 from './ProductWidget/ProductWidgetVariation6.svelte';
	import { typedInclude } from '$lib/utils/typedIncludes';
	import { typedKeys } from '$lib/utils/typedKeys';
	import ProductWidgetVariation0 from './ProductWidget/ProductWidgetVariation0.svelte';
	import type { ProductWidgetProduct } from './ProductWidget/ProductWidgetProduct';
	import ProductWidgetMobile from './ProductWidget/ProductWidgetMobile.svelte';

	export let pictures: Picture[] | [];
	export let product: ProductWidgetProduct;
	export let hasDigitalFiles: boolean;
	export let canBuy: boolean;
	export let externalUrl: string | undefined = undefined;

	let className = '';
	export { className as class };
	export let displayOption = 'img-0';
	$: canAddToCart =
		canBuy && (!product.availableDate || product.availableDate <= new Date() || !!product.preorder);
	const widgets = {
		'img-0': {
			component: ProductWidgetVariation0
		},
		'img-1': {
			component: ProductWidgetVariation1
		},
		'img-2': {
			component: ProductWidgetVariation2
		},
		'img-3': {
			component: ProductWidgetVariation3
		},
		'img-4': {
			component: ProductWidgetVariation4
		},
		'img-5': {
			component: ProductWidgetVariation5
		},
		'img-6': {
			component: ProductWidgetVariation6
		}
	};

	$: widget = typedInclude(typedKeys(widgets), displayOption)
		? widgets[displayOption]
		: widgets['img-0'];
</script>

<div class="lg:hidden contents">
	<svelte:component
		this={ProductWidgetMobile}
		{product}
		{pictures}
		{hasDigitalFiles}
		{externalUrl}
		class={className}
	/>
</div>
<div class="hidden lg:contents">
	<svelte:component
		this={widget.component}
		{product}
		{pictures}
		{hasDigitalFiles}
		{canAddToCart}
		{externalUrl}
		class={className}
	/>
</div>
