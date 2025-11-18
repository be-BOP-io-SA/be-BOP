<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import type { Currency } from '$lib/types/Currency';

	export let totalExcl: number;
	export let totalIncl: number;
	export let currency: Currency;
	export let vatRates: number[];

	const { t } = useI18n();
</script>

<div class="flex flex-col border-t border-gray-300 py-6 w-fit">
	<h2 class="text-3xl underline uppercase">{t('cart.total')}</h2>
	<div class="grid grid-cols-2 gap-4 grid-rows-2 justify-start">
		<div class="text-2xl">{t('pos.split.exclVat')}</div>
		<PriceTag amount={totalExcl} {currency} main class="text-2xl" />
		<div class="text-2xl">
			{t('pos.split.inclVat', {
				rates: vatRates.map((rate) => `${rate}%`).join(', ')
			})}
		</div>
		<PriceTag amount={totalIncl} {currency} main class="text-2xl" />
	</div>
</div>
