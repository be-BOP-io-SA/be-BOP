<script lang="ts">
	import ProductItem from '$lib/components/ProductItem.svelte';
	import { downloadFile } from '$lib/utils/downloadFile.js';
	import { page } from '$app/stores';
	import { PRODUCT_PAGINATION_LIMIT } from '$lib/types/Product.js';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import Select from 'svelte-select';
	export let data;

	let eshopVisible = data.productActionSettings.eShop.visible;
	let retailVisible = data.productActionSettings.retail.visible;
	let nostrVisible = data.productActionSettings.nostr.visible;
	let googleShoppingVisible = data.productActionSettings.googleShopping.visible;
	let eshopBasket = data.productActionSettings.eShop.canBeAddedToBasket;
	let retailBasket = data.productActionSettings.retail.canBeAddedToBasket;
	let nostrBasket = data.productActionSettings.nostr.canBeAddedToBasket;
	let next = 0;

	const tagsForSelect = data.tags.map((tag) => ({
		value: tag._id,
		label: tag.name
	}));
	const selectedTagId = $page.url.searchParams.get('tagId');
	let selectedTag = tagsForSelect.find((tag) => tag.value === selectedTagId) ?? null;

	$: picturesByProduct = Object.fromEntries(
		[...data.pictures].reverse().map((picture) => [picture.productId, picture])
	);

	async function exportData() {
		const response = await fetch(`${data.adminPrefix}/backup/create`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ exportType: 'product' })
		});

		if (!response.ok) {
			alert('Error ' + response.status + ': ' + (await response.text()));
		}

		const blob = await response.blob();
		downloadFile(blob, 'backup.json');
	}
</script>

<a href="{data.adminPrefix}/product/new" class="underline block">Add product</a>
<a href="{data.adminPrefix}/product/prices" class="underline block">Products price</a>
<a href="{data.adminPrefix}/product/alias" class="underline block">Products aliases</a>
<a href="{data.adminPrefix}/product/tags" class="underline block">Products tags</a>
<a href="{data.adminPrefix}/product/default-picture" class="underline block"
	>Products default picture</a
>

{#if 0}
	<button on:click={exportData} class="btn btn-black self-start">Export catalog</button>
	<a href="{data.adminPrefix}/backup/import?type=catalog" class="btn btn-black self-start"
		>Import catalog</a
	>
{/if}

<form method="post" class="flex flex-col gap-4" action="?/update">
	<h3 class="text-xl">Default action settings</h3>
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
	<button type="submit" class="btn btn-blue self-start">Update</button>
</form>

<h1 class="text-3xl">List of products</h1>

<form class="flex flex-col" method="GET">
	<div class="gap-4 flex flex-col md:flex-row mb-4">
		<label class="form-label w-[15em]">
			Product Id
			<input class="form-input" type="text" name="productId" placeholder="search product by id" />
		</label>
		<label class="form-label w-[15em]">
			Product Name
			<input
				class="form-input"
				type="text"
				name="productName"
				value={$page.url.searchParams.get('productName')}
				placeholder="search product by name"
			/>
		</label>
		<label class="form-label w-[15em]">
			Product Type
			<select name="productType" class="form-input">
				<option></option>
				{#each ['resource', 'subscription', 'donation'] as type}
					<option value={type} selected={$page.url.searchParams.get('productType') === type}
						>{upperFirst(type)}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-[15em]">
			Product Attribute
			<select name="productAttribute" class="form-input">
				<option></option>
				{#each ['shipping', 'standalone', 'payWhatYouWant', 'free', 'isTicket', 'preorder'] as attribute}
					<option
						value={attribute}
						selected={$page.url.searchParams.get('productAttribute') === attribute}
						>{upperFirst(attribute)}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-[15em]">
			Stock
			<select name="stock" class="form-input">
				<option></option>
				{#each ['no-stock-management', 'with-stock', 'no-stock'] as stock}
					<option value={stock} selected={$page.url.searchParams.get('stock') === stock}
						>{upperFirst(stock)}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-[15em]">
			Product Tag
			<Select
				items={tagsForSelect}
				searchable={true}
				placeholder="Select a tag"
				clearable={true}
				bind:value={selectedTag}
				class="form-input"
			/>
			<input type="hidden" name="tagId" value={selectedTag?.value ?? ''} />
		</label>
		<label class="form-label w-auto mt-8 flex flex-row">
			<input type="submit" value="🔍" class="btn body-mainCTA" on:click={() => (next = 0)} />
			<a href="/admin/product" class="btn body-mainCTA">🧹</a>
		</label>
	</div>
	<div class="flex flex-row flex-wrap gap-6">
		{#each data.products as product}
			<ProductItem {product} picture={picturesByProduct[product._id]} isAdmin />
		{/each}
	</div>

	<div class="flex flex-row mx-auto mt-4 gap-4">
		<input type="hidden" value={next} name="skip" />
		{#if Number($page.url.searchParams.get('skip'))}
			<button
				class="btn btn-blue"
				type="submit"
				on:click={() => (next = Math.max(0, next - PRODUCT_PAGINATION_LIMIT))}>&lt; Previous</button
			>
		{/if}
		{#if data.products.length >= PRODUCT_PAGINATION_LIMIT}
			<button class="btn btn-blue" type="submit" on:click={() => (next += PRODUCT_PAGINATION_LIMIT)}
				>Next &gt;</button
			>
		{/if}
	</div>
</form>
