<script lang="ts">
	import CmsDesign from '$lib/components/CmsDesign.svelte';

	export let data;
</script>

<main class="flex flex-col bg-gray-100 border rounded-lg">
	{#if data.cmsWelcome && data.cmsWelcomeData}
		<div class="p-4">
			<CmsDesign
				challenges={data.cmsWelcomeData.challenges}
				tokens={data.cmsWelcomeData.tokens}
				sliders={data.cmsWelcomeData.sliders}
				products={data.cmsWelcomeData.products}
				pictures={data.cmsWelcomeData.pictures}
				tags={data.cmsWelcomeData.tags}
				digitalFiles={data.cmsWelcomeData.digitalFiles}
				specifications={data.cmsWelcomeData.specifications}
				contactForms={data.cmsWelcomeData.contactForms}
				countdowns={data.cmsWelcomeData.countdowns}
				galleries={data.cmsWelcomeData.galleries}
				leaderboards={data.cmsWelcomeData.leaderboards}
				schedules={data.cmsWelcomeData.schedules}
				pageName={data.cmsWelcome.title}
				websiteLink={data.websiteLink}
				brandName={data.brandName}
				sessionEmail={data.email}
				hasPosOptions={false}
			/>
		</div>
	{/if}
</main>
