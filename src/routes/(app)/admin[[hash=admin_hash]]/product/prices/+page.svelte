<script lang="ts">
	import ProductVATCalcRow from '$lib/components/ProductVATCalcRow.svelte';

	export let data;

	let displayVATCalculator = false;
</script>

<h1 class="text-3xl">Bulk Price Change</h1>

<label class="checkbox-label">
	<input
		class="form-checkbox"
		type="checkbox"
		name="vatCalculator"
		bind:checked={displayVATCalculator}
	/>
	Display VAT calculator
</label>

<form class="flex flex-col gap-2" method="post">
	{#each data.products as product}
		<ProductVATCalcRow
			productId={product._id}
			productName={product.name}
			initialPrice={product.price}
			{displayVATCalculator}
		/>
	{/each}
	<button class="btn btn-black self-start mt-4" type="submit">Update</button>
</form>
