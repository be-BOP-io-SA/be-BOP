<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import PictureComponent from '../Picture.svelte';
	import PriceTag from '../PriceTag.svelte';
	import ProductType from '../ProductType.svelte';
	import { useI18n } from '$lib/i18n';
	import type { ProductWidgetProduct } from './ProductWidgetProduct';

	export let pictures: Picture[] | [];
	export let product: ProductWidgetProduct;
	export let hasDigitalFiles: boolean;
	export let externalUrl: string | undefined = undefined;

	let className = '';
	export { className as class };
	const { t } = useI18n();

	$: productUrl = externalUrl ?? `/product/${product._id}`;
</script>

<div class="mx-auto tagWidget tagWidget-main flex flex-wrap rounded {className}">
	<div class="flex-col grid">
		<div class="flex-row justify-start">
			<ProductType {product} {hasDigitalFiles} class="last:rounded-tr first:rounded-bl text-sm" />
		</div>
		<a
			href={productUrl}
			target={externalUrl ? '_blank' : undefined}
			rel={externalUrl ? 'noopener noreferrer' : undefined}
		>
			<PictureComponent picture={pictures[0]} class="object-contain max-h-full max-w-full" />
		</a>
	</div>
	<div class="grid flex-col gap-2 px-4 py-2 justify-end">
		<div class="flex flex-col gap-2">
			<a
				href={productUrl}
				class="flex flex-col"
				target={externalUrl ? '_blank' : undefined}
				rel={externalUrl ? 'noopener noreferrer' : undefined}
			>
				<h2 class="text-2xl body-title">{product.name}</h2>
			</a>

			<div class="flex flex-row gap-1">
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
				<span class="text-base mt-1">({t('product.horsTaxeShort')})</span>
			</div>
		</div>
		{#if externalUrl}
			<div class="px-4 pb-4">
				<a
					href={externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="btn cartPreview-mainCTA text-lg text-center w-full p-2"
				>
					{t('product.cta.view')}
				</a>
			</div>
		{/if}
	</div>
</div>
