<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import type { Currency } from '$lib/types/Currency';

	// Props для item
	export let item: {
		product: {
			name: string;
			price: { currency: Currency };
		};
		internalNote?: {
			value: string;
		};
	};
	export let quantity: number;
	export let priceInfo: { amount: number; currency: Currency };
	export let vatRate: number;

	// Controls
	export let showInternalNote = true;
	export let controls: 'none' | 'move-to-cart' | 'return-to-pool' = 'none';
	export let isComplete = false;

	// Callbacks
	export let onMoveOne: (() => void) | undefined = undefined;
	export let onMoveAll: (() => void) | undefined = undefined;
	export let onReturnOne: (() => void) | undefined = undefined;
	export let onReturnAll: (() => void) | undefined = undefined;

	const { t } = useI18n();
</script>

<div class="py-3 border-b border-gray-300">
	<div class="flex items-center gap-2 mb-2">
		{#if controls === 'return-to-pool'}
			<div class="flex gap-2">
				<button
					class="text-orange-600 hover:text-orange-700 font-bold text-3xl leading-none"
					on:click={onReturnAll}
				>
					⏪
				</button>
				<button
					class="border-4 border-orange-600 hover:border-orange-700 text-orange-600 hover:text-orange-700 font-bold text-2xl leading-none px-3 py-1 rounded"
					on:click={onReturnOne}
				>
					➖
				</button>
			</div>
		{/if}

		<div class="flex-1 text-2xl font-bold">
			{quantity} X {item.product.name.toUpperCase()}
		</div>

		{#if controls === 'move-to-cart'}
			<div class="flex gap-2">
				{#if isComplete}
					<div class="text-3xl text-green-600">✅</div>
				{:else}
					<button
						class="border-4 border-blue-600 hover:border-blue-700 text-blue-600 hover:text-blue-700 font-bold text-2xl leading-none px-3 py-1 rounded"
						on:click={onMoveOne}
					>
						➕
					</button>
					<button
						class="text-blue-600 hover:text-blue-700 font-bold text-3xl leading-none"
						on:click={onMoveAll}
					>
						⏩
					</button>
				{/if}
			</div>
		{/if}

		{#if isComplete && controls === 'none'}
			<div class="text-3xl text-green-600">✅</div>
		{/if}
	</div>

	{#if showInternalNote && item.internalNote?.value}
		<div class="text-xl text-gray-600 mb-2">+{item.internalNote.value}</div>
	{/if}

	<div class="grid grid-cols-4 w-full items-center justify-around text-xl">
		<div>{t('pos.split.exclVat')}</div>
		<PriceTag amount={priceInfo.amount} currency={priceInfo.currency} main />
		<div>{t('pos.split.vatRate', { rate: vatRate })}</div>
		<PriceTag
			amount={(priceInfo.amount * vatRate) / 100}
			currency={priceInfo.currency}
			main
		/>
	</div>
</div>
