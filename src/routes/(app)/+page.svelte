<script lang="ts">
	import Catalog from '$lib/components/Catalog.svelte';
	import CmsPage from '$lib/components/CmsPage.svelte';
	export let data;
</script>

{#if data.cmsData}
	<CmsPage
		{...data}
		challenges={data.cmsData.challenges}
		tokens={data.cmsData.tokens}
		sliders={data.cmsData.sliders}
		tags={data.cmsData.tags}
		products={data.cmsData.products}
		pictures={data.cmsData.pictures}
		digitalFiles={data.cmsData.digitalFiles}
		roleId={data.roleId ? data.roleId : ''}
		specifications={data.cmsData.specifications}
		contactForms={data.cmsData.contactForms}
		sessionEmail={data.email}
		pageName={data.cmsPage.title}
		websiteLink={data.websiteLink}
		brandName={data.brandName}
		countdowns={data.cmsData.countdowns}
		galleries={data.cmsData.galleries}
		leaderboards={data.cmsData.leaderboards}
	/>
{:else}
	<Catalog {...data.catalog} />
{/if}
