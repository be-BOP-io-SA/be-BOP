<script lang="ts">
	import { PUBLIC_VERSION } from '$env/static/public';
	import { page } from '$app/stores';

	export let data;
	$: lang = new URL($page.url).searchParams.get('lang') || 'en';
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl">Back-office home</h1>
	<p>
		Welcome on be-BOP back-office! From here, you'll be able to manage, configure, and monitor your
		be-BOP.
	</p>

	<h1 class="text-xl">A word from your administrator :</h1>
	<p>
		<em class="whitespace-pre-line">{data.adminWelcomMessage}</em>
	</p>

	<h1 class="text-xl">be-BOP version & updates</h1>

	<h1 class="text-xl">Version check</h1>
	<p>
		You're currently using this version of be-BOP :<br />
		<code class="font-mono">{PUBLIC_VERSION}</code>
	</p>
	<p>
		The last version on official repo is : <br />
		<code class="font-mono">{PUBLIC_VERSION}</code>
	</p>

	<p class="check">✅ Your be-BOP is from an official build</p>
	<p class="check">✅ Your be-BOP version is up-to-date</p>

	<div class="justify-between">
		<h1 class="text-xl">Last releases</h1>
		<a href="https://be-bop.io/release-note" target="_blank" class="body-hyperlink">
			>>> Check here for more updates</a
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

	<h1 class="text-xl" id="doc">Documentation</h1>

	<p>Select your language :</p>
	<div class="flex flex-row justify-evenly">
		<a href="?lang=en#doc">🇬🇧</a>
		<a href="?lang=fr#doc">🇫🇷</a>
		<a href="?lang=it#doc">🇮🇹</a>
		<a href="?lang=es-sv#doc"> 🇸🇻</a>
		<a href="?lang=nl#doc">🇳🇱</a>
		<a href="?lang=de#doc">🇩🇪</a>
		<a href="?lang=pt#doc">🇵🇹</a>
	</div>
	<p>Select your topic :</p>

	<ul>
		{#each data.files as file}
			<li><a href="/docs/{lang}/{file}" class="body-hyperlink" target="_blank">{file}</a></li>
		{/each}
	</ul>
</div>
