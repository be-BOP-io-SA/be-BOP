<script lang="ts">
	import CmsDesign from '$lib/components/CmsDesign.svelte';
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import IconEmail from '$lib/components/icons/IconEmail.svelte';
	import IconNostr from '$lib/components/icons/IconNostr.svelte';
	import IconQr from '$lib/components/icons/IconQr.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<div class="mx-auto max-w-7xl px-8">
	<button
		class="self-start text-gray-800 font-semibold text-lg flex items-center"
		on:click={() => history.back()}
	>
		<IconBack />
		{t('customerTouch.ctaBack')}
	</button>

	{#if data.cmsIntro2 && data.cmsIntro2Data}
		<div
			class="w-full bg-gray-100 mt-4 rounded-lg p-12 flex items-center justify-center text-center font-semibold text-gray-700 text-xl mb-4"
		>
			<CmsDesign
				challenges={data.cmsIntro2Data.challenges}
				tokens={data.cmsIntro2Data.tokens}
				sliders={data.cmsIntro2Data.sliders}
				products={data.cmsIntro2Data.products}
				pictures={data.cmsIntro2Data.pictures}
				tags={data.cmsIntro2Data.tags}
				digitalFiles={data.cmsIntro2Data.digitalFiles}
				specifications={data.cmsIntro2Data.specifications}
				contactForms={data.cmsIntro2Data.contactForms}
				countdowns={data.cmsIntro2Data.countdowns}
				galleries={data.cmsIntro2Data.galleries}
				leaderboards={data.cmsIntro2Data.leaderboards}
				schedules={data.cmsIntro2Data.schedules}
				pageName={data.cmsIntro2.title}
				websiteLink={data.websiteLink}
				brandName={data.brandName}
				sessionEmail={data.email}
				hasPosOptions={false}
			/>
		</div>
	{/if}

	<div class="flex flex-col items-center justify-center">
		<h1 class="text-3xl font-bold text-gray-900 m-4">{t('customerTouch.loginText')}</h1>

		<div class="w-full grid grid-cols-2 gap-4 m-4">
			<a
				href="/pos/customer-touch/list/home"
				class="bg-red-400 text-white font-bold rounded-3xl text-2xl h-full flex items-center justify-center"
			>
				{t('customerTouch.noThanksCta')}
			</a>

			<div class="flex flex-col gap-4">
				<a
					href="/pos/customer-touch/email"
					class="bg-blue-300 text-gray-900 font-semibold py-5 rounded-xl text-xl flex items-center justify-center space-x-2 min-h-[80px]"
				>
					<IconEmail />
					<span>E-mail</span>
				</a>
				<a
					href="/pos/customer-touch/nostr"
					class="bg-jagger-500 text-white font-semibold py-5 rounded-xl text-xl flex items-center justify-center space-x-2 min-h-[80px]"
				>
					<IconNostr />
					<span>Nostr</span>
				</a>

				<button
					disabled
					class="bg-gray-700 text-white font-semibold py-5 rounded-xl text-xl flex items-center justify-center space-x-2 min-h-[80px]"
				>
					<IconQr />
					<span>QR</span>
				</button>
			</div>
		</div>
	</div>
	{#if data.cmsIntro2 && data.cmsIntro2Data}
		<div
			class="w-full bg-gray-100 mt-4 rounded-lg p-12 flex items-center justify-center text-center font-semibold text-gray-700 text-xl"
		>
			<CmsDesign
				challenges={data.cmsIntro2Data.challenges}
				tokens={data.cmsIntro2Data.tokens}
				sliders={data.cmsIntro2Data.sliders}
				products={data.cmsIntro2Data.products}
				pictures={data.cmsIntro2Data.pictures}
				tags={data.cmsIntro2Data.tags}
				digitalFiles={data.cmsIntro2Data.digitalFiles}
				specifications={data.cmsIntro2Data.specifications}
				contactForms={data.cmsIntro2Data.contactForms}
				countdowns={data.cmsIntro2Data.countdowns}
				galleries={data.cmsIntro2Data.galleries}
				leaderboards={data.cmsIntro2Data.leaderboards}
				schedules={data.cmsIntro2Data.schedules}
				pageName={data.cmsIntro2.title}
				websiteLink={data.websiteLink}
				brandName={data.brandName}
				sessionEmail={data.email}
				hasPosOptions={false}
			/>
		</div>
	{/if}
</div>
