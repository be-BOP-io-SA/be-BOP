<script lang="ts">
	export let data;

	let eshopVisible = data.productActionSettings.eShop.visible;
	let retailVisible = data.productActionSettings.retail.visible;
	let nostrVisible = data.productActionSettings.nostr.visible;
	let googleShoppingVisible = data.productActionSettings.googleShopping.visible;
	let eshopBasket = data.productActionSettings.eShop.canBeAddedToBasket;
	let retailBasket = data.productActionSettings.retail.canBeAddedToBasket;
	let nostrBasket = data.productActionSettings.nostr.canBeAddedToBasket;

	let selected: Record<string, boolean> = {};

	$: allSelected =
		data.products.length > 0 && data.products.every((product) => selected[product._id]);

	function toggleAll(value: boolean) {
		selected = Object.fromEntries(data.products.map((product) => [product._id, value]));
	}
</script>

<h1 class="text-3xl">Bulk product action settings</h1>

<form method="post" class="flex flex-col gap-4">
	<h3 class="text-xl">Action settings to apply</h3>
	<table class="w-full border border-gray-300 divide-y divide-gray-300">
		<thead class="bg-gray-200">
			<tr>
				<th class="py-2 px-4 border-r border-gray-300">Action</th>
				<th class="py-2 px-4 border-r border-gray-300">Eshop (anyone)</th>
				<th class="py-2 px-4 border-r border-gray-300">Retail (POS logged seat)</th>
				<th class="py-2 px-4 border-r border-gray-300">Google Shopping</th>
				<th class="py-2 px-4">Nostr-bot</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td class="py-2 px-4 border-r border-gray-300">Product is visible</td>
				<td class="py-2 px-4 border-r border-gray-300 text-center">
					<input type="checkbox" bind:checked={eshopVisible} name="eshopVisible" class="rounded" />
				</td>
				<td class="py-2 px-4 border-r border-gray-300 text-center">
					<input
						type="checkbox"
						bind:checked={retailVisible}
						name="retailVisible"
						class="rounded"
					/>
				</td>
				<td class="py-2 px-4 border-r border-gray-300 text-center">
					<input
						type="checkbox"
						bind:checked={googleShoppingVisible}
						name="googleShoppingVisible"
						class="rounded"
					/>
				</td>
				<td class="py-2 px-4 border-r border-gray-300 text-center">
					<input type="checkbox" bind:checked={nostrVisible} name="nostrVisible" class="rounded" />
				</td>
			</tr>
			<tr>
				<td class="py-2 px-4 border border-gray-300">Product can be added to basket</td>
				<td class="py-2 px-4 border border-gray-300 text-center">
					<input type="checkbox" bind:checked={eshopBasket} name="eshopBasket" class="rounded" />
				</td>
				<td class="py-2 px-4 border border-gray-300 text-center">
					<input type="checkbox" bind:checked={retailBasket} name="retailBasket" class="rounded" />
				</td>
				<td class="py-2 px-4 border border-gray-300 text-center" />
				<td class="py-2 px-4 border border-gray-300 text-center">
					<input type="checkbox" bind:checked={nostrBasket} name="nostrBasket" class="rounded" />
				</td>
			</tr>
		</tbody>
	</table>

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
