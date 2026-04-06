<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import { UrlDependency } from '$lib/types/UrlDependency';
	import { createEventDispatcher } from 'svelte';

	export let productName: string;
	export let productPrice: number;
	export let productCurrency: string;
	export let currentDiscount: number | undefined;
	export let currentJustification: string | undefined;
	export let lineId: string | undefined;
	export let productId: string;

	const dispatch = createEventDispatcher<{ cancel: void }>();
	const { t } = useI18n();

	const DISCOUNT_PRESETS = [5, 10, 20, 25, 30, 40, 50, 100] as const;

	let selectedPercentage = currentDiscount ?? 0;
	let customPercentInput = '';
	let customAmountInput = '';
	let justification = currentJustification ?? '';

	function selectPreset(pct: number) {
		selectedPercentage = pct;
		customPercentInput = '';
		customAmountInput = '';
	}

	function handleCustomPercentInput() {
		const val = parseFloat(customPercentInput);
		if (!isNaN(val) && val >= 0) {
			selectedPercentage = Math.round(Math.min(val, 100) * 100) / 100;
			customAmountInput = '';
		}
	}

	function handleCustomAmountInput() {
		const val = parseFloat(customAmountInput);
		if (!isNaN(val) && val > 0 && productPrice > 0) {
			selectedPercentage = Math.min((val / productPrice) * 100, 100);
			customPercentInput = '';
		}
	}
</script>

<div class="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/50">
	<div class="flex justify-between items-center mb-3">
		<h4 class="font-semibold text-lg">
			{t('cart.discount.title', { productName })}
		</h4>
		<button
			type="button"
			class="text-gray-400 hover:text-gray-700 text-xl leading-none"
			on:click={() => dispatch('cancel')}
		>
			&times;
		</button>
	</div>

	<div class="flex flex-wrap gap-2 mb-4">
		<button
			type="button"
			class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors
				{selectedPercentage === 0
				? 'bg-blue-500 text-white'
				: 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-100'}"
			on:click={() => selectPreset(0)}
		>
			{t('cart.discount.noDiscount')}
		</button>
		{#each DISCOUNT_PRESETS as pct}
			<button
				type="button"
				class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors
					{selectedPercentage === pct
					? 'bg-blue-500 text-white'
					: 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-100'}"
				on:click={() => selectPreset(pct)}
			>
				{pct}%
			</button>
		{/each}
	</div>

	<div class="grid grid-cols-2 gap-3 mb-4">
		<label class="form-label text-sm">
			{t('cart.discount.customPercent')}
			<input
				type="number"
				class="form-input"
				min="0"
				max="100"
				step="0.1"
				placeholder={t('cart.discount.customPercentPlaceholder')}
				bind:value={customPercentInput}
				on:input={handleCustomPercentInput}
			/>
		</label>
		<label class="form-label text-sm">
			{t('cart.discount.customAmount', { currency: productCurrency })}
			<input
				type="number"
				class="form-input"
				min="0"
				step="0.01"
				placeholder={t('cart.discount.customAmountPlaceholder')}
				bind:value={customAmountInput}
				on:input={handleCustomAmountInput}
			/>
		</label>
	</div>

	<form
		method="POST"
		action="/cart/{productId}/?/setDiscount"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					await invalidate(UrlDependency.Cart);
					dispatch('cancel');
				} else {
					await applyAction(result);
				}
			};
		}}
	>
		<input type="hidden" name="discountPercentage" value={selectedPercentage} />
		{#if lineId}
			<input type="hidden" name="lineId" value={lineId} />
		{/if}

		<label class="form-label text-sm mb-3">
			{t('cart.discount.justification')}
			<input
				type="text"
				class="form-input"
				name="justification"
				placeholder={t('cart.discount.justificationPlaceholder')}
				bind:value={justification}
				required={selectedPercentage > 0}
			/>
		</label>

		<div class="flex justify-end gap-2 mt-4">
			<button
				type="button"
				class="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
				on:click={() => dispatch('cancel')}
			>
				{t('cart.discount.cancel')}
			</button>
			<button type="submit" class="btn bg-blue-500 text-white hover:bg-blue-600">
				{t('cart.discount.validate')}
			</button>
		</div>
	</form>
</div>
