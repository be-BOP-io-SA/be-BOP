<script lang="ts">
	import CmsPage from '$lib/components/CmsPage.svelte';
	export let data;
</script>

<CmsPage
	cmsPage={data.cmsPage}
	challenges={data.cmsData.challenges}
	tokens={data.cmsData.tokens}
	sliders={data.cmsData.sliders}
	tags={data.cmsData.tags}
	products={data.cmsData.products}
	pictures={data.cmsData.pictures}
	digitalFiles={data.cmsData.digitalFiles}
	hasPosOptions={data.hasPosOptions}
	specifications={data.cmsData.specifications}
	contactForms={data.cmsData.contactForms}
	pageName={data.cmsPage.title}
	websiteLink={data.websiteLink}
	brandName={data.brandName}
	sessionEmail={data.email}
	countdowns={data.cmsData.countdowns}
	galleries={data.cmsData.galleries}
	leaderboards={data.cmsData.leaderboards}
	schedules={data.cmsData.schedules}
/>
