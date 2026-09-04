<script lang="ts">
	import CmsDesign from '$lib/components/CmsDesign.svelte';
	import IconBag from '$lib/components/icons/IconBag.svelte';
	import IconChair from '$lib/components/icons/IconChair.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
	let target = '';
</script>

<form class="mx-auto max-w-7xl p-8" method="post">
	<div class="text-xl font-bold tracking-widest">{t('customerTouch.welcomHello')},</div>
	<div class="text-xl font-bold tracking-widest">{t('customerTouch.welcomeQuestion')}</div>
	<div class="grid grid-cols-2 sm:flex-row gap-6 mt-8">
		<input type="hidden" value={target} name="target" />
		<button class="flex flex-col items-center" type="submit" on:click={() => (target = 'onsite')}
			><div class="p-10 bg-gray-100 rounded-xl shadow-md flex justify-center w-full">
				<IconChair />
			</div>
			<span class="text-xl font-semibold m-4">{t('customerTouch.welcomeOnSiteCta')}</span>
		</button>

		<button
			class="flex flex-col items-center"
			type="submit"
			on:click={() => (target = 'take-away')}
		>
			<div class="p-10 bg-gray-100 rounded-xl shadow-md flex justify-center w-full">
				<IconBag />
			</div>
			<span class="text-xl font-semibold m-4 whitespace-nowrap"
				>{t('customerTouch.welcomeTakeAwayCta')}</span
			>
		</button>
	</div>
	{#if data.cmsIntro && data.cmsIntroData}
		<div class="grid grid-cols sm:flex-row gap-6 mt-2">
			<div class="flex flex-col items-center p-10 bg-gray-100 rounded-xl shadow-md justify-center">
				<CmsDesign
					challenges={data.cmsIntroData.challenges}
					tokens={data.cmsIntroData.tokens}
					sliders={data.cmsIntroData.sliders}
					products={data.cmsIntroData.products}
					pictures={data.cmsIntroData.pictures}
					tags={data.cmsIntroData.tags}
					digitalFiles={data.cmsIntroData.digitalFiles}
					specifications={data.cmsIntroData.specifications}
					contactForms={data.cmsIntroData.contactForms}
					countdowns={data.cmsIntroData.countdowns}
					galleries={data.cmsIntroData.galleries}
					leaderboards={data.cmsIntroData.leaderboards}
					schedules={data.cmsIntroData.schedules}
					pageName={data.cmsIntro.title}
					websiteLink={data.websiteLink}
					brandName={data.brandName}
					sessionEmail={data.email}
					hasPosOptions={false}
				/>
			</div>
		</div>
	{/if}
</form>
