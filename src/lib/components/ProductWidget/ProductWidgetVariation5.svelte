<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import PictureComponent from '../Picture.svelte';

	import AddToCart from '../AddToCart.svelte';
	import { useI18n } from '$lib/i18n';
	import type { ProductWidgetProduct } from './ProductWidgetProduct';

	let className = '';
	export { className as class };
	const { t } = useI18n();

	export let product: ProductWidgetProduct;
	export let pictures: Picture[] | [];
	export let canAddToCart: boolean;
	export let externalUrl: string | undefined = undefined;
	let pictureId = 0;

	$: productUrl = externalUrl ?? `/product/${product._id}`;
</script>

<div class="flex flex-row gap-4 {className}">
	<div class="flex flex-row w-full tagWidget tagWidget-main grow pr-5">
		<div class="p-4 grow-[2] w-2/3">
			<a
				href={productUrl}
				target={externalUrl ? '_blank' : undefined}
				rel={externalUrl ? 'noopener noreferrer' : undefined}
			>
				<h2 class="text-2xl font-bold mb-2 body-title">{product.name}</h2>
			</a>
			<a
				href={productUrl}
				target={externalUrl ? '_blank' : undefined}
				rel={externalUrl ? 'noopener noreferrer' : undefined}
			>
				<p class="mb-4">{product.shortDescription}</p>
			</a>
			{#if externalUrl}
				<div class="relative">
					<div class="flex flex-wrap gap-6">
						<a
							href={externalUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="btn cartPreview-mainCTA text-xl text-center w-full md:w-[150px] p-1"
						>
							{t('product.cta.view')}
						</a>
					</div>
				</div>
			{:else if canAddToCart}
				<div class="relative">
					<div class="flex flex-wrap gap-6">
						<AddToCart
							{product}
							picture={pictures[0]}
							btnTranslationKey="product.cta.buy"
							class="btn cartPreview-mainCTA text-xl text-center w-full md:w-[150px] p-1"
							detailBtn={true}
						/>
					</div>
				</div>
			{/if}
		</div>

		<div class="grow">
			<a
				href={productUrl}
				target={externalUrl ? '_blank' : undefined}
				rel={externalUrl ? 'noopener noreferrer' : undefined}
			>
				<PictureComponent picture={pictures[pictureId]} class="h-[280px] ml-auto object-contain" />
			</a>
		</div>
	</div>
	{#if pictures.length > 1}
		<div class="grow-[1] flex-col hidden sm:inline">
			<div class="flex flex-col items-end">
				{#each pictures.slice(0, 3) as picture, i}
					<button type="button" on:click={() => (pictureId = i)}>
						<PictureComponent
							{picture}
							class="w-[88px] h-[88px] border-gray-300 border rounded object-cover mb-2 {pictureId ===
							i
								? 'ring-2 ring-link ring-offset-2'
								: ''} "
						/>
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
