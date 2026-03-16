<script lang="ts">
	import CmsDesign from '$lib/components/CmsDesign.svelte';

	export let data;
</script>

<main class="flex flex-col bg-gray-100 border rounded-lg">
	<div class="p-4">
		<h2 class="text-3xl font-bold text-gray-900 mb-4">{data.categoryLabel}</h2>

		{#if data.cmsCategory && data.cmsCategoryData}
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
		{/if}
	</div>
</main>
