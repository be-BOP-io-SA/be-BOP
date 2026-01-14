<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import CmsDesign from '$lib/components/CmsDesign.svelte';

	export let data;

	let timeoutId: ReturnType<typeof setInterval>;
	onMount(() => {
		timeoutId = setTimeout(() => {
			goto('/pos/customer-touch/welcome');
		}, data.timeoutDroppedSeconds * 1000);
	});
	onDestroy(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	});
	const { t } = useI18n();
</script>

<div class="mx-auto max-w-7xl flex flex-col items-center justify-center p-2">
	<h1 class="text-4xl font-bold text-gray-900 mb-10 text-center">
		{t('customerTouch.deletedOrderTitle')}
	</h1>

	{#if data.cmsDrop && data.cmsDropData}
		<div
			class="w-full bg-[#f0f0f0] rounded-xl p-8 flex items-center justify-center text-center font-semibold text-gray-700 text-xl md:text-2xl"
		>
			<CmsDesign
				challenges={data.cmsDropData.challenges}
				tokens={data.cmsDropData.tokens}
				sliders={data.cmsDropData.sliders}
				products={data.cmsDropData.products}
				pictures={data.cmsDropData.pictures}
				tags={data.cmsDropData.tags}
				digitalFiles={data.cmsDropData.digitalFiles}
				specifications={data.cmsDropData.specifications}
				contactForms={data.cmsDropData.contactForms}
				countdowns={data.cmsDropData.countdowns}
				galleries={data.cmsDropData.galleries}
				leaderboards={data.cmsDropData.leaderboards}
				schedules={data.cmsDropData.schedules}
				pageName={data.cmsDrop.title}
				websiteLink={data.websiteLink}
				brandName={data.brandName}
				sessionEmail={data.email}
				hasPosOptions={false}
			/>
		</div>
	{/if}
</div>
