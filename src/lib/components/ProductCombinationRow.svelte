<script lang="ts">
	import { MultiSelect } from 'svelte-multiselect';
	import { createEventDispatcher } from 'svelte';

	export let product: { productId: string; quantity: number };
	export let comboIdx: number;
	export let prodIdx: number;
	export let availableProductList: Array<{ _id: string; name: string }>;

	const dispatch = createEventDispatcher<{ remove: null; change: null }>();

	function hasStringValue(o: unknown): o is { value: string } {
		return (
			!!o &&
			typeof o === 'object' &&
			'value' in o &&
			typeof (o as { value: unknown }).value === 'string'
		);
	}

	function handleSelectChange(
		e: CustomEvent<{ option?: unknown; type: 'add' | 'remove' | 'removeAll' }>
	) {
		const { type, option } = e.detail;
		if (type === 'add' && hasStringValue(option)) {
			product.productId = option.value;
		} else if (type === 'remove' || type === 'removeAll') {
			product.productId = '';
		}
		dispatch('change');
	}
</script>

<div class="flex gap-2 items-center mb-1">
	<div class="flex-[4] min-w-0">
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			maxSelect={1}
			options={availableProductList.map((p) => ({ label: p.name, value: p._id }))}
			selected={product.productId
				? [
						{
							value: product.productId,
							label:
								availableProductList.find((p) => p._id === product.productId)?.name ??
								product.productId
						}
				  ]
				: []}
			on:change={handleSelectChange}
		/>
	</div>
	<input
		type="hidden"
		name="combinations[{comboIdx}][{prodIdx}][productId]"
		value={product.productId}
	/>
	<input
		type="number"
		min="1"
		class="form-input flex-1 min-w-0 !h-[30px] !py-0"
		name="combinations[{comboIdx}][{prodIdx}][quantity]"
		bind:value={product.quantity}
		placeholder="Required quantity"
		title="Required quantity of this product to trigger the discount"
	/>
	<button type="button" class="shrink-0" on:click={() => dispatch('remove')}>🗑️</button>
</div>
