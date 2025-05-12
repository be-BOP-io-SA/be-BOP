<script lang="ts">
	import MultiSelect from 'svelte-multiselect';

	export let data;
</script>

<h1 class="text-3xl">Bulk tags edit</h1>

<form class="flex flex-col gap-2" method="post">
	{#each data.products as product}
		<h2 class="text-2xl">{product.name}</h2>
		<div class="gap-2 mx-4">
			<!-- svelte-ignore a11y-label-has-associated-control -->
			<label class="form-label"
				>Product Tags
				<MultiSelect
					name="{product._id}.tagIds"
					options={data.tags.map((tag) => ({
						value: tag._id,
						label: tag.name
					}))}
					selected={product.tagIds?.map((tagId) => ({
						value: tagId,
						label: data.tags.find((tag) => tag._id === tagId)?.name ?? tagId
					})) ?? []}
				/>
			</label>
		</div>
	{/each}

	<button class="btn btn-black self-start mt-4" type="submit">Update</button>
</form>
