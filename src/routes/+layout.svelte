<script>
	import '../app.css';
	import '@fontsource/outfit/700.css';
	import '@fontsource/outfit/600.css';
	import '@fontsource/outfit/500.css';
	import '@fontsource/outfit/400.css';
	import '@fontsource/outfit/300.css';
	import '@fontsource/poppins/400.css';
	import '@fontsource/gloock/400.css';
	import { page } from '$app/stores';
	import { setContext } from 'svelte';
	import { PUBLIC_VERSION } from '$env/static/public';

	export let data;

	setContext('language', data.language);
</script>

<svelte:head>
	<title>{data.websiteTitle}</title>
	<meta name="viewport" content={data.viewportWidth} />
	<meta name="description" content={$page.data.websiteShortDescription} />
	<link rel="stylesheet" href="/style/variables.css?v={data.themeChangeNumber}" />
	{#if data.faviconPictureId}
		<link rel="icon" href="/favicon/{data.faviconPictureId}" />
	{:else}
		<link rel="icon" href="/favicon.png" />
	{/if}
	<script
		lang="javascript"
		src="/script/language/en.js?v={PUBLIC_VERSION}-{data.enUpdatedAt.getTime()}"
	></script>
	{#if data.language !== 'en'}
		<script
			lang="javascript"
			src="/script/language/{data.language}.js?v={PUBLIC_VERSION}-{data.languageUpdatedAt.getTime()}"
		></script>
	{/if}
	{#if data.analyticsScriptSnippet}
		<!-- eslint-disable svelte/no-at-html-tags -->
		{@html data.analyticsScriptSnippet}
	{/if}
</svelte:head>

<slot class="body body-mainPlan" />
