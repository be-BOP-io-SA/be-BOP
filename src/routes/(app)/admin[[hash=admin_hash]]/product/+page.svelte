<script lang="ts">
	import ProductActionSettingsCards from '$lib/components/ProductActionSettingsCards.svelte';
	import ProductItem from '$lib/components/ProductItem.svelte';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { downloadFile } from '$lib/utils/downloadFile.js';
	import { page } from '$app/stores';
	import { PRODUCT_PAGINATION_LIMIT } from '$lib/types/Product.js';
	import Select from 'svelte-select';
	import { useI18n } from '$lib/i18n';
	export let data;

	const { t } = useI18n();

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
			alert(
				t('admin.product.exportError', { status: response.status, message: await response.text() })
			);
		}

		const blob = await response.blob();
		downloadFile(blob, 'backup.json');
	}
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="{data.adminPrefix}/product/new" class="underline block">{t('admin.product.addProduct')}</a>
<a href="{data.adminPrefix}/product/prices" class="underline block"
	>{t('admin.product.productsPrice')}</a
>
<a href="{data.adminPrefix}/product/alias" class="underline block"
	>{t('admin.product.productsAliases')}</a
>
<a href="{data.adminPrefix}/product/tags" class="underline block"
	>{t('admin.product.productsTags')}</a
>
<a href="{data.adminPrefix}/product/default-picture" class="underline block"
	>{t('admin.product.productsDefaultPicture')}</a
>

{#if 0}
	<button on:click={exportData} class="btn btn-black self-start"
		>{t('admin.product.exportCatalog')}</button
	>
	<a href="{data.adminPrefix}/backup/import?type=catalog" class="btn btn-black self-start"
		>{t('admin.product.importCatalog')}</a
	>
{/if}

<form method="post" class="flex flex-col gap-4" action="?/update">
	<h3 class="text-xl">{t('admin.product.defaultActionSettingsTitle')}</h3>
	<ProductActionSettingsCards
		bind:eshopVisible
		bind:retailVisible
		bind:googleShoppingVisible
		bind:nostrVisible
		bind:eshopBasket
		bind:retailBasket
		bind:nostrBasket
	/>
	<button type="submit" class="btn btn-blue self-start">{t('admin.action.update')}</button>
</form>

<h1 class="text-3xl">{t('admin.product.listOfProductsTitle')}</h1>

<form class="flex flex-col" method="GET">
	<div class="gap-4 flex flex-col md:flex-row md:flex-wrap mb-4">
		<label class="form-label w-[15em]">
			{t('admin.product.productIdLabel')}
			<input
				class="form-input"
				type="text"
				name="productId"
				placeholder={t('admin.product.searchProductByIdPlaceholder')}
			/>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.product.productNameLabel')}
			<input
				class="form-input"
				type="text"
				name="productName"
				value={$page.url.searchParams.get('productName')}
				placeholder={t('admin.product.searchProductByNamePlaceholder')}
			/>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.product.productTypeLabel')}
			<select name="productType" class="form-input">
				<option></option>
				{#each [['resource', 'type.resource'], ['subscription', 'type.subscription'], ['donation', 'type.donation']] as [type, labelKey]}
					<option value={type} selected={$page.url.searchParams.get('productType') === type}
						>{t(`admin.product.${labelKey}`)}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.product.productAttributeLabel')}
			<select name="productAttribute" class="form-input">
				<option></option>
				{#each [['shipping', 'attribute.shipping'], ['standalone', 'attribute.standalone'], ['payWhatYouWant', 'attribute.payWhatYouWant'], ['free', 'attribute.free'], ['isTicket', 'attribute.isTicket'], ['preorder', 'attribute.preorder']] as [attribute, labelKey]}
					<option
						value={attribute}
						selected={$page.url.searchParams.get('productAttribute') === attribute}
						>{t(`admin.product.${labelKey}`)}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.product.stockLabel')}
			<select name="stock" class="form-input">
				<option></option>
				{#each [['no-stock-management', 'stock.noStockManagement'], ['with-stock', 'stock.withStock'], ['no-stock', 'stock.noStock']] as [stock, labelKey]}
					<option value={stock} selected={$page.url.searchParams.get('stock') === stock}
						>{t(`admin.product.${labelKey}`)}</option
					>
				{/each}
			</select>
		</label>
		<label class="form-label w-[15em]">
			{t('admin.product.productTagLabel')}
			<Select
				items={tagsForSelect}
				searchable={true}
				placeholder={t('admin.product.selectTagPlaceholder')}
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

	<div class="no-sticky flex flex-row mx-auto mt-4 gap-4">
		<input type="hidden" value={next} name="skip" />
		{#if Number($page.url.searchParams.get('skip'))}
			<button
				class="btn btn-blue"
				type="submit"
				on:click={() => (next = Math.max(0, next - PRODUCT_PAGINATION_LIMIT))}
				>&lt; {t('admin.product.previous')}</button
			>
		{/if}
		{#if data.products.length >= PRODUCT_PAGINATION_LIMIT}
			<button class="btn btn-blue" type="submit" on:click={() => (next += PRODUCT_PAGINATION_LIMIT)}
				>{t('admin.product.next')} &gt;</button
			>
		{/if}
	</div>
</form>
