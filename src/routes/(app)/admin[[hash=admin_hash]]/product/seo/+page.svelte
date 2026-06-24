<script lang="ts">
	export let data;

	let hideFromSEO = false;

	let selected: Record<string, boolean> = {};

	$: allSelected =
		data.products.length > 0 && data.products.every((product) => selected[product._id]);

	function toggleAll(value: boolean) {
		selected = Object.fromEntries(data.products.map((product) => [product._id, value]));
	}
</script>

<h1 class="text-3xl">Bulk product SEO options</h1>

<form method="post" class="flex flex-col gap-4">
	<h3 class="text-xl">SEO options to apply</h3>
	<label class="checkbox-label">
		<input type="checkbox" bind:checked={hideFromSEO} name="hideFromSEO" class="rounded" />
		Hide this product from search engines
	</label>

	<h3 class="text-xl">Products</h3>
	<div class="flex gap-4">
		<button type="button" class="underline" on:click={() => toggleAll(true)}>Select all</button>
		<button type="button" class="underline" on:click={() => toggleAll(false)}>Unselect all</button>
	</div>

	<table class="w-full border border-gray-300 divide-y divide-gray-300">
		<thead class="bg-gray-200">
			<tr>
				<th class="py-2 px-4 border-r border-gray-300 w-12">
					<input
						type="checkbox"
						checked={allSelected}
						on:change={(event) => toggleAll(event.currentTarget.checked)}
					/>
				</th>
				<th class="py-2 px-4 border-r border-gray-300 text-left">Slug</th>
				<th class="py-2 px-4 text-left">Name</th>
			</tr>
		</thead>
		<tbody>
			{#each data.products as product}
				<tr>
					<td class="py-2 px-4 border-r border-gray-300 text-center">
						<input
							type="checkbox"
							name="productIds"
							value={product._id}
							bind:checked={selected[product._id]}
						/>
					</td>
					<td class="py-2 px-4 border-r border-gray-300">{product._id}</td>
					<td class="py-2 px-4">{product.name}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<button type="submit" class="btn btn-black self-start">Apply to selection</button>
</form>
