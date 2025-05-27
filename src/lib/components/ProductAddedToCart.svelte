<script lang="ts">
	import type { BasicProductFrontend } from '$lib/types/Product';
	import type { Picture as PictureType } from '$lib/types/Picture';
	import Picture from './Picture.svelte';
	import PriceTag from './PriceTag.svelte';
	import IconCross from './icons/IconCross.svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Currency } from '$lib/types/Currency';
	import { useI18n } from '$lib/i18n';

	export let product: BasicProductFrontend;
	export let picture: PictureType | undefined;
	export let customPrice: { amount: number; currency: Currency } | undefined;
	export let depositPercentage: number | undefined;
	export let discountPercentage: number | undefined;
	export let chosenVariations: Record<string, string> | undefined;
	export let priceMultiplier: number | undefined;
	export let removePopinProductPrice: boolean | undefined;

	let className = '';
	export { className as class };

	const { t, locale } = useI18n();

	const dispatch = createEventDispatcher<{ dismiss: void }>();

	$: price = customPrice || product.price;
</script>

<div class="{className} cartPreview flex flex-wrap p-2 gap-4 relative">
	<Picture {picture} class="w-[138px] h-[138px] border-gray-300 border rounded object-cover" />
	<div class="flex flex-col grow gap-1">
		<h2 class="body-title text-[18px] font-medium">{t('product.addedToCart')}</h2>
		<h3 class="text-base font-light">
			{chosenVariations
				? product.name +
				  ' - ' +
				  Object.entries(chosenVariations)
						.map(([key, value]) => product.variationLabels?.values[key][value])
						.join(' - ')
				: product.name}
		</h3>
		{#if !removePopinProductPrice}
			<PriceTag
				currency={price.currency}
				class="text-xl body-secondaryText"
				amount={((price.amount * (priceMultiplier ?? 1) * (depositPercentage ?? 100)) / 100) *
					(discountPercentage ? (100 - discountPercentage) / 100 : 1)}
				main
				>{depositPercentage
					? `(${(depositPercentage / 100).toLocaleString($locale, { style: 'percent' })})`
					: ''}</PriceTag
			>
		{/if}
		<div class="flex gap-2">
			<a href="/cart" class="grow basis-0 btn cartPreview-mainCTA min-h-[2em] h-auto">
				{t('cart.cta.view')}
			</a>
			<a href="/checkout" class="grow basis-0 btn cartPreview-secondaryCTA h-auto">
				{t('cart.cta.checkout')}
			</a>
		</div>
	</div>
	<button class="absolute top-2 right-2" type="button" on:click={() => dispatch('dismiss')}>
		<IconCross />
	</button>
</div>
