<script lang="ts">
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';
	import type {
		CmsChallenge,
		CmsDigitalFile,
		CmsPicture,
		CmsProduct,
		CmsSlider,
		CmsTag,
		CmsTokens,
		CmsSpecification,
		CmsContactForm,
		CmsCountdown,
		CmsGallery,
		CmsLeaderboard,
		CmsSchedule
	} from '$lib/server/cms';
	import CmsDesign from './CmsDesign.svelte';

	export let cmsPage: {
		_id: string;
		title: string;
		shortDescription: string;
		fullScreen: boolean;
		displayRawContent?: boolean;
		hideFromSEO?: boolean | undefined;
		metas?: {
			name: string;
			content: string;
		}[];
	};
	export let products: CmsProduct[];
	export let pictures: CmsPicture[];
	export let challenges: CmsChallenge[];
	export let tokens: CmsTokens;
	export let sliders: CmsSlider[];
	export let digitalFiles: CmsDigitalFile[];
	export let hasPosOptions: boolean | undefined;
	export let sessionEmail: string | undefined;
	export let pageName: string | undefined;
	export let websiteLink: string | undefined;
	export let brandName: string | undefined;
	export let tags: CmsTag[];
	export let specifications: CmsSpecification[];
	export let contactForms: CmsContactForm[];
	export let countdowns: CmsCountdown[];
	export let galleries: CmsGallery[];
	export let leaderboards: CmsLeaderboard[];
	export let schedules: CmsSchedule[];
	$: contentIsHtmlDocument = tokens.desktop[0]?.type === 'htmlDocumentMarker';

	const { t } = useI18n();
</script>

<svelte:head>
	{#if !contentIsHtmlDocument}
		<title>{cmsPage.title}</title>
		{#if cmsPage.hideFromSEO}
			<meta name="robots" content="noindex" />
		{/if}
		{#if cmsPage.metas?.length}
			{#each cmsPage.metas as meta}
				<meta name={meta.name} content={meta.content} />
			{/each}
		{/if}
	{/if}
</svelte:head>

{#if cmsPage.fullScreen || contentIsHtmlDocument}
	<CmsDesign
		{products}
		{pictures}
		{challenges}
		{tokens}
		{digitalFiles}
		{sliders}
		{tags}
		{hasPosOptions}
		{specifications}
		{contactForms}
		{sessionEmail}
		{pageName}
		{websiteLink}
		{brandName}
		{countdowns}
		{galleries}
		{leaderboards}
		{schedules}
		class={cmsPage.displayRawContent ? '' : 'prose max-w-full body body-mainPlan'}
	/>
{:else}
	<main class="mx-auto max-w-7xl px-6">
		{#if cmsPage._id === 'error' && $page.url.pathname !== '/error'}
			<div class="mt-4 p-2 border-2 border-red-500 rounded text-center text-red-500 font-bold">
				{t('error.404', { invalidUrl: $page.url.pathname })}
			</div>
		{/if}
		<CmsDesign
			{products}
			{pictures}
			{challenges}
			{tokens}
			{digitalFiles}
			{sliders}
			{tags}
			{hasPosOptions}
			{specifications}
			{contactForms}
			{sessionEmail}
			{pageName}
			{websiteLink}
			{brandName}
			{countdowns}
			{galleries}
			{leaderboards}
			{schedules}
			class={cmsPage.displayRawContent ? '' : 'prose max-w-full body'}
		/>
	</main>
{/if}
