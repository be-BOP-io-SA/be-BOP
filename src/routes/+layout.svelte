<script>
	import appCssUrl from '../app.css?url';
	import fsOutfit700Url from '@fontsource/outfit/700.css?url';
	import fsOutfit600Url from '@fontsource/outfit/600.css?url';
	import fsOutfit500Url from '@fontsource/outfit/500.css?url';
	import fsOutfit400Url from '@fontsource/outfit/400.css?url';
	import fsOutfit300Url from '@fontsource/outfit/300.css?url';
	import fsPoppins400Url from '@fontsource/poppins/400.css?url';
	import fsGloock400Url from '@fontsource/gloock/400.css?url';
	import { page } from '$app/stores';
	import { setContext } from 'svelte';
	import { PUBLIC_VERSION } from '$env/static/public';

	export let data;

	setContext('language', data.language);
</script>

<!--
  PLEASE READ CAREFULLY:

  Svelte controls all page rendering in this application.

  When the CMS “advanced HTML” mode is enabled, pages may contain a full HTML
  document (including <head> and <body>). In that case, we inject the document’s
  <head> content via <svelte:head> and render its <body> content directly in the
  slot. The flag $page.data.disableAppLayout indicates this mode.

  Since disableAppLayout originates from the page content itself (the lowest
  layer in the render stack), it prevents effective server pre-rendering.

  For this reason, we avoid wrapping the body in
  <div style="display: contents">...</div> in app.html (as SvelteKit normally
  recommends) and only apply that wrapper here when $page.data.disableAppLayout
  is not set.
-->

<svelte:head>
	{#if !$page.data.disableAppLayout}
		<title>{data.websiteTitle}</title>
		<meta charset="utf-8" />
		<meta name="viewport" content={data.viewportWidth} />
		<meta name="description" content={$page.data.websiteShortDescription} />
		<link rel="stylesheet" href={appCssUrl} />
		<link rel="stylesheet" href={fsOutfit700Url} />
		<link rel="stylesheet" href={fsOutfit600Url} />
		<link rel="stylesheet" href={fsOutfit500Url} />
		<link rel="stylesheet" href={fsOutfit400Url} />
		<link rel="stylesheet" href={fsOutfit300Url} />
		<link rel="stylesheet" href={fsPoppins400Url} />
		<link rel="stylesheet" href={fsGloock400Url} />
		<link rel="stylesheet" href="/style/variables.css?v={data.themeChangeNumber}" />
		<script>
			const theme = localStorage.getItem('theme') ?? document.documentElement.dataset.theme;
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else if (theme === 'light') {
				document.documentElement.classList.remove('dark');
			} else {
				if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
					document.documentElement.classList.add('dark');
				} else {
					document.documentElement.classList.remove('dark');
				}
			}
		</script>
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
	{/if}
</svelte:head>

{#if $page.data.disableAppLayout}
	<slot />
{:else}
	<div style="display: contents">
		<slot class="body body-mainPlan" />
	</div>
{/if}
