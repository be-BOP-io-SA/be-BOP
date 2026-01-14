<script lang="ts">
	import { goto } from '$app/navigation';
	import { useI18n } from '$lib/i18n';
	import CmsDesign from '$lib/components/CmsDesign.svelte';

	export let data;

	const { t } = useI18n();
</script>

<div class="max-w-full flex flex-col items-center justify-center p-2">
	<h1 class="text-4xl font-bold text-gray-900 mb-10 text-center">
		{t('customerTouch.cancelOrderTitlle')}
	</h1>

	<div class="w-full flex flex-col gap-4 mb-12">
		<button
			on:click={() => goto('/pos/customer-touch/list/home')}
			class="bg-[#8fd16a] font-bold py-5 rounded-lg text-2xl w-full shadow-md hover:opacity-90 transition-opacity duration-200"
		>
			{t('customerTouch.cta.resumeOrder')}
		</button>
		<button
			on:click={() => goto('/pos/customer-touch/dropped')}
			class="bg-[#f47c8c] text-white font-bold py-5 rounded-lg text-2xl w-full shadow-md hover:opacity-90 transition-opacity duration-200"
		>
			{t('customerTouch.cta.abandonment')} !
		</button>
	</div>

	{#if data.cmsDropConfirm && data.cmsDropConfirmData}
		<div
			class="w-full bg-[#f0f0f0] rounded-xl p-8 flex items-center justify-center text-center font-semibold text-gray-700 text-xl md:text-2xl"
		>
			<CmsDesign
				challenges={data.cmsDropConfirmData.challenges}
				tokens={data.cmsDropConfirmData.tokens}
				sliders={data.cmsDropConfirmData.sliders}
				products={data.cmsDropConfirmData.products}
				pictures={data.cmsDropConfirmData.pictures}
				tags={data.cmsDropConfirmData.tags}
				digitalFiles={data.cmsDropConfirmData.digitalFiles}
				specifications={data.cmsDropConfirmData.specifications}
				contactForms={data.cmsDropConfirmData.contactForms}
				countdowns={data.cmsDropConfirmData.countdowns}
				galleries={data.cmsDropConfirmData.galleries}
				leaderboards={data.cmsDropConfirmData.leaderboards}
				schedules={data.cmsDropConfirmData.schedules}
				pageName={data.cmsDropConfirm.title}
				websiteLink={data.websiteLink}
				brandName={data.brandName}
				sessionEmail={data.email}
				hasPosOptions={false}
			/>
		</div>
	{/if}
</div>
