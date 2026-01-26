<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import type { Currency } from '$lib/types/Currency';

	export let totalExcl: number;
	export let totalIncl: number;
	export let currency: Currency;
	export let vatRates: number[];
	export let totalInclBeforeDiscount: number | undefined = undefined;
	export let discountPercentage: number | undefined = undefined;

	const { t } = useI18n();
</script>

<div class="flex flex-col border-t border-gray-300 py-6 w-fit">
	<h2 class="text-3xl underline uppercase">{t('pos.touch.subtotal')}</h2>
	<div class="grid grid-cols-2 gap-4 justify-start">
		<div class="text-2xl">{t('pos.split.exclVat')}</div>
		<PriceTag amount={totalExcl} {currency} main class="text-2xl" />
		{#if totalInclBeforeDiscount && discountPercentage}
			<div class="text-2xl">
				{t('pos.split.inclVat', {
					rates: vatRates.map((rate) => `${rate}%`).join(', ')
				})}
			</div>
			<PriceTag
				amount={totalInclBeforeDiscount}
				{currency}
				main
				class="text-2xl line-through text-gray-500"
			/>
			<div class="text-2xl">
				{t('pos.discount.title')}
				{discountPercentage}%
			</div>
			<PriceTag
				amount={-(totalInclBeforeDiscount - totalIncl)}
				{currency}
				main
				class="text-2xl text-gray-500"
			/>
			<div class="col-span-2 h-2"></div>
			<h2 class="text-3xl underline uppercase">{t('pos.touch.total')}</h2>
			<div class="text-2xl font-bold col-span-2">
				<PriceTag amount={totalIncl} {currency} main class="text-2xl" />
			</div>
		{:else}
			<div class="text-2xl">
				{t('pos.split.inclVat', {
					rates: vatRates.map((rate) => `${rate}%`).join(', ')
				})}
			</div>
			<PriceTag amount={totalIncl} {currency} main class="text-2xl" />
		{/if}
	</div>
</div>
