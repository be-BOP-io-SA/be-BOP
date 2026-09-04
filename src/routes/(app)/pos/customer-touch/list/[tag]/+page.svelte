<script lang="ts">
	import CmsDesign from '$lib/components/CmsDesign.svelte';
	import CustomerTouchProduct from '$lib/components/CustomerTouchProduct.svelte';

	export let data;

	$: picturesByProduct = Object.fromEntries(
		[...data.pictures].reverse().map((picture) => [picture.productId, picture])
	);
</script>

<main class="flex flex-col bg-gray-100 border rounded-lg">
	{#if data.cmsCategory && data.cmsCategoryData}
		<div class="p-4">
			<CmsDesign
				challenges={data.cmsCategoryData.challenges}
				tokens={data.cmsCategoryData.tokens}
				sliders={data.cmsCategoryData.sliders}
				products={data.cmsCategoryData.products}
				pictures={data.cmsCategoryData.pictures}
				tags={data.cmsCategoryData.tags}
				digitalFiles={data.cmsCategoryData.digitalFiles}
				specifications={data.cmsCategoryData.specifications}
				contactForms={data.cmsCategoryData.contactForms}
				countdowns={data.cmsCategoryData.countdowns}
				galleries={data.cmsCategoryData.galleries}
				leaderboards={data.cmsCategoryData.leaderboards}
				schedules={data.cmsCategoryData.schedules}
				pageName={data.cmsCategory.title}
				websiteLink={data.websiteLink}
				brandName={data.brandName}
				sessionEmail={data.email}
				hasPosOptions={false}
			/>
		</div>
	{/if}

	<div class="p-2 text-center">
		<h2 class="text-3xl font-bold text-gray-900 mb-4">{data.categoryLabel}</h2>
		<div class="grid grid-cols-3 gap-2 content-start">
			{#each data.products as product}
				<CustomerTouchProduct {product} picture={picturesByProduct[product._id]} />
			{/each}
		</div>
	</div>
</main>
