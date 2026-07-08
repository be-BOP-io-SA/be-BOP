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
	import CookieConsentBanner from '$lib/components/CookieConsentBanner.svelte';
	import { cookieConsentVisible } from '$lib/stores/cookieConsentVisible';

	export let data;

	setContext('language', data.language);

	// Show the banner when an analytics snippet is configured AND the visitor either hasn't
	// made a choice yet OR explicitly re-opened it via the 🍪 buttons. Backoffice paths
	// (/admin, /admin/*, /admin-<hash>/*, /pos, /pos/*) are excluded — staff/cashier UI
	// shouldn't get a visitor-facing GDPR banner. Segment matching (not bare prefix) so a
	// storefront CMS slug like /positions or /possibilities keeps receiving the banner.
	// `/admin-*` is safe against CMS-slug collisions: `zodSlug()` in `$lib/server/zod` blocks
	// any slug that equals `admin` or starts with `admin-`.
	$: isBackoffice =
		$page.url.pathname === '/admin' ||
		$page.url.pathname.startsWith('/admin/') ||
		$page.url.pathname.startsWith('/admin-') ||
		$page.url.pathname === '/pos' ||
		$page.url.pathname.startsWith('/pos/');
	$: showCookieConsent =
		data.analyticsSnippetConfigured &&
		!isBackoffice &&
		(data.analyticsConsent === null || $cookieConsentVisible);
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

{#if showCookieConsent}
	<CookieConsentBanner hostnames={data.analyticsHostnames} />
{/if}
