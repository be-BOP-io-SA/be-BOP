<script lang="ts">
	import { PUBLIC_VERSION } from '$env/static/public';
	import { page } from '$app/stores';
	import TelemetryBanner from '$lib/components/TelemetryBanner.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	$: lang = new URL($page.url).searchParams.get('lang') || 'en';
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl">{t('admin.home.title')}</h1>
	<p>
		{t('admin.home.welcome')}
	</p>

	<h1 class="text-xl">{t('admin.home.adminWord')}</h1>
	<p>
		<em class="whitespace-pre-line">{data.adminWelcomMessage}</em>
	</p>

	{#if data.showTelemetryBanner}
		<TelemetryBanner adminPrefix={data.adminPrefix} nostrConfigured={data.nostrConfigured} />
	{/if}

	<h1 class="text-xl">{t('admin.home.versionUpdates')}</h1>

	<h1 class="text-xl">{t('admin.home.versionCheck')}</h1>
	<p>
		{t('admin.home.currentVersion')}<br />
		<code class="font-mono">{PUBLIC_VERSION}</code>
	</p>
	<p>
		{t('admin.home.latestVersion')} <br />
		<code class="font-mono">{PUBLIC_VERSION}</code>
	</p>

	<p class="check">✅ {t('admin.home.officialBuild')}</p>
	<p class="check">✅ {t('admin.home.upToDate')}</p>

	<div class="justify-between">
		<h1 class="text-xl">{t('admin.home.lastReleases')}</h1>
		<a href="https://be-bop.io/release-note" target="_blank" class="body-hyperlink">
			>>> {t('admin.home.checkForUpdates')}</a
		>

		{#if 0}
			<table class="w-full table-auto">
				<thead>
					<tr>
						<th>Release date</th>
						<th>Object</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>08/03/2025</td>
						<td>Feature "Leaderboard"</td>
					</tr>
					<tr>
						<td>06/03/2025</td>
						<td>Various bugfixes (minor)</td>
					</tr>
					<tr>
						<td>05/03/2025</td>
						<td>Add VAT and delivery fees on Transactions > Reporting</td>
					</tr>
					<tr>
						<td>04/03/2025</td>
						<td>Fix on transaction confirmation threshold</td>
					</tr>
					<tr>
						<td>02/03/2025</td>
						<td>Various documentation</td>
					</tr>
				</tbody>
			</table>

			<button>>>> Check for more</button>
		{/if}
	</div>

	<h1 class="text-xl" id="doc">{t('admin.home.documentation')}</h1>

	<p>{t('admin.home.selectLanguage')}</p>
	<div class="flex flex-row justify-evenly">
		<a href="?lang=en#doc">🇬🇧</a>
		<a href="?lang=fr#doc">🇫🇷</a>
		<a href="?lang=it#doc">🇮🇹</a>
		<a href="?lang=es-sv#doc"> 🇸🇻</a>
		<a href="?lang=nl#doc">🇳🇱</a>
		<a href="?lang=de#doc">🇩🇪</a>
		<a href="?lang=pt#doc">🇵🇹</a>
	</div>
	<p>{t('admin.home.selectTopic')}</p>

	<ul>
		{#each data.files as file}
			<li><a href="/docs/{lang}/{file}" class="body-hyperlink" target="_blank">{file}</a></li>
		{/each}
	</ul>
</div>
