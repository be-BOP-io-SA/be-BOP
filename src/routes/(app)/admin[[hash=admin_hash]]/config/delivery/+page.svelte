<script lang="ts">
	import DeliveryFeesSelector from '$lib/components/DeliveryFeesSelector.svelte';

	export let data;
	export let form;

	let mode: 'flatFee' | 'perItem' = data.deliveryFees.mode;
	let onlyPayHighest = data.deliveryFees.onlyPayHighest;
	let applyFlatFeeToEachItem = data.deliveryFees.applyFlatFeeToEachItem;

	let deliveryFees = data.deliveryFees.deliveryFees || {};
</script>

{#if form?.success}
	<p class="alert-success">Values updated</p>
{/if}

<h1 class="text-3xl">Delivery fees config</h1>

<form method="post" class="flex flex-col gap-4">
	<label class="checkbox-label">
		<input type="radio" bind:group={mode} class="form-radio" name="mode" value="flatFee" />
		Flat fee
	</label>

	<label class="checkbox-label">
		<input type="radio" bind:group={mode} class="form-radio" name="mode" value="perItem" />
		Fee depending on product
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="allowFreeForPOS"
			class="form-checkbox"
			checked={data.deliveryFees.allowFreeForPOS}
		/>
		Allow voiding delivery fees on POS sale
	</label>
	<h2 class="text-2xl">
		{mode === 'flatFee' ? 'Flat fee config' : 'Product delivery fees'}
	</h2>

	{#if mode === 'perItem'}
		<p class="alert-info">
			Those delivery fees will be applied to your products, unless overriden inside the product
			itself.
		</p>

		<label class="checkbox-label">
			<input type="checkbox" class="form-checkbox" name="onlyPayHighest" checked={onlyPayHighest} />
			For orders with multiple products, only apply the delivery fee of the product with the highest
			delivery fee
		</label>
	{/if}

	{#if mode === 'flatFee'}
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				name="applyFlatFeeToEachItem"
				checked={applyFlatFeeToEachItem}
			/>
			Apply flat fee for each item instead of once for the whole order
		</label>
	{/if}

	<DeliveryFeesSelector {deliveryFees} defaultCurrency={data.currencies.priceReference} />

	<div>
		<button type="submit" class="btn btn-black self-start"> Save config </button>
	</div>
</form>
