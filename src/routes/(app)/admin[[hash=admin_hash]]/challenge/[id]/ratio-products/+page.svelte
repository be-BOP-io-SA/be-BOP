<script lang="ts">
	export let data;
</script>

<h1 class="text-3xl">Edit ratio per product</h1>
<form method="post" class="contents">
	{#each data.products.filter((prod) => !data.challenge.productIds?.length || data.challenge.productIds.includes(prod._id)) as product}
		<h1 class="text-xl">{product.name}</h1>
		<label class="form-label"
			>Custom ratio
			<input
				type="number"
				class="form-input"
				name="perProductRatio[{product._id}]"
				value={data.challenge.perProductRatio?.[product._id]
					? data.challenge.perProductRatio[product._id]
					: 100}
				min="0"
				step="1"
				max="100"
				required
			/>
		</label>
	{/each}
	<button type="submit" class="btn btn-black self-start">Update</button>
</form>
