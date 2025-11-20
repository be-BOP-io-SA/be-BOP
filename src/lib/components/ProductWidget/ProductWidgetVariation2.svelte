<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import PictureComponent from '../Picture.svelte';
	import PriceTag from '../PriceTag.svelte';
	import ProductType from '../ProductType.svelte';
	import AddToCart from '../AddToCart.svelte';
	import { useI18n } from '$lib/i18n';
	import type { ProductWidgetProduct } from './ProductWidgetProduct';

	export let pictures: Picture[] | [];
	export let product: ProductWidgetProduct;
	export let hasDigitalFiles: boolean;
	export let canAddToCart: boolean;
	export let externalUrl: string | undefined = undefined;

	let className = '';
	export { className as class };
	const { t } = useI18n();

	$: productUrl = externalUrl ?? `/product/${product._id}`;
</script>

<div
	class="relative mx-auto max-w-max tagWidget tagWidget-main flex flex-wrap gap-4 p-6 rounded {className}"
>
	<div class="flex flex-col">
		<div class="flex flex-row justify-start -mt-6 -ml-6">
			<ProductType
				{product}
				{hasDigitalFiles}
				class="last:rounded-tr first:rounded-bl pl-2 text-sm"
			/>
		</div>
		<a
			href={productUrl}
			class="-ml-6"
			target={externalUrl ? '_blank' : undefined}
			rel={externalUrl ? 'noopener noreferrer' : undefined}
		>
			<PictureComponent picture={pictures[0]} class="object-contain max-h-[264px] max-w-[264px]" />
		</a>
	</div>

	<div class="flex flex-col gap-2">
		<div class="flex flex-col gap-2">
			<a
				href={productUrl}
				class="flex flex-col"
				target={externalUrl ? '_blank' : undefined}
				rel={externalUrl ? 'noopener noreferrer' : undefined}
			>
				<h2 class="text-2xl body-title">{product.name}</h2>
			</a>

			<div class="flex flex-row gap-2">
				<PriceTag
					amount={product.price.amount}
					currency={product.price.currency}
					class="text-2xl"
					main
				/>
				<PriceTag
					class="text-base"
					amount={product.price.amount}
					currency={product.price.currency}
					secondary
				/>
				<span class="font-semibold">{t('product.vatExcluded')}</span>
			</div>
		</div>
		<a
			href={productUrl}
			class="flex flex-col"
			target={externalUrl ? '_blank' : undefined}
			rel={externalUrl ? 'noopener noreferrer' : undefined}
		>
			<p class="mt-2 max-w-[500px]">
				{product.shortDescription}
			</p>
		</a>
		{#if externalUrl}
			<div class="flex flex-row items-end justify-end">
				<a
					href={externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="btn cartPreview-mainCTA"
				>
					{t('product.cta.view')}
				</a>
			</div>
		{:else if canAddToCart}
			<div class="flex flex-row items-end justify-end">
				<AddToCart {product} picture={pictures[0]} class="btn cartPreview-mainCTA" />
			</div>
		{/if}
	</div>
</div>
