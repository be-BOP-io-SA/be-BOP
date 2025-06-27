<script lang="ts">
	import IconChevronDown from './icons/IconChevronDown.svelte';
	import IconChevronUp from './icons/IconChevronUp.svelte';
	import type { LayoutData } from '../../routes/(app)/$types';
	import { DEFAULT_MAX_QUANTITY_PER_ORDER } from '$lib/types/Product';
	import { useI18n } from '$lib/i18n';

	export let sm = false;
	export let disabled = false;

	export let item: NonNullable<LayoutData['cart']['items']>[number];

	const { t } = useI18n();
</script>

<div class="flex">
	<button
		formaction="/cart/{item.product._id}/?/decrease"
		class="{sm ? 'px-1' : 'px-3'} bg-gray-300 rounded-l text-gray-800 disabled:text-gray-450"
		disabled={disabled || item.quantity <= 0}
	>
		<span class="sr-only">{t('cart.sr.decrease')}</span><IconChevronDown
			class={sm ? 'scale-75' : ''}
		/>
	</button>
	<input
		type="number"
		class="form-input text-center text-gray-850 {sm
			? 'text-sm !h-6 w-8 p-1'
			: 'text-xl w-12'} rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
		disabled
		name="quantity"
		value={item.quantity}
	/>
	<input type="hidden" name="quantity" value={item.quantity} />
	<input type="hidden" name="deposit" value={!!item.depositPercentage} />
	<button
		formaction="/cart/{item.product._id}/?/increase"
		class="{sm ? 'px-1' : 'px-3'} bg-gray-300 text-gray-800 disabled:text-gray-450 rounded-r"
		disabled={disabled ||
			item.quantity >= (item.product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER) ||
			(item.product.stock && item.product.stock.available <= 0)}
	>
		<span class="sr-only">{t('cart.sr.increase')}</span><IconChevronUp
			class={sm ? 'scale-75' : ''}
		/>
	</button>
</div>
