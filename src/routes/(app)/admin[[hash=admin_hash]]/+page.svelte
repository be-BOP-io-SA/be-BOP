<script lang="ts">
	import { onMount } from 'svelte';
	let version = '';
	$: files = [];
	$: lang = 'en';

	async function fetchFiles() {
		try {
			const res = await fetch(`/docs/${lang}`);
			files = await res.json();
		} catch (error) {
			console.error('Erreur lors du chargement des fichiers :', error);
		}
	}
	onMount(async () => {
		try {
			const res = await fetch('/.well-known/version.txt');
			version = await res.text();
			fetchFiles();
		} catch (error) {
			console.error('Error while fetching version:', error);
		}
	});
</script>

<div class="flex flex-col gap-4 mx-auto">
	<h1 class="text-2xl">Back-office home</h1>
	<p>
		Welcome on be-BOP back-office! From here, you'll be able to manage, configure, and monitor your
		be-BOP.
	</p>

	<h1 class="text-xl">A word from your administrator :</h1>
	<p>
		<em
			>Lorem ipsum dolor sit amet consectetur adipisicing elit. Eius unde laudantium quam
			repudiandae tenetur quaerat veritatis laborum nisi, consequuntur nemo quidem, modi repellendus
			eveniet culpa autem odit consectetur ipsa tempore.</em
		>
	</p>

	<h1 class="text-xl">be-BOP version & updates</h1>

	<h1 class="text-xl">Version check</h1>
	<p>
		You're currently using this version of be-BOP :<br />
		<code class="font-mono">{version}</code>
	</p>
	<p>
		The last version on official repo is : <br />
		<code class="font-mono">{version}</code>
	</p>

	<p class="check">✅ Your be-BOP is from an official build</p>
	<p class="check">✅ Your be-BOP version is up-to-date</p>

	<div class="justify-between">
		<h1 class="text-xl">Last releases</h1>
		<button>>>> Check here for more updates</button>

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
	</div>

	<h1 class="text-xl">Documentation</h1>

	<p>Select your language :</p>
	<div class="flex flex-row justify-evenly">
		<button
			on:click={() => {
				lang = 'en';
				fetchFiles();
			}}>🇬🇧</button
		>
		<button
			on:click={() => {
				lang = 'fr';
				fetchFiles();
			}}>🇫🇷</button
		>
		<span class="opacity-50">🇮🇹</span>
		<span class="opacity-50">🇸🇻</span>
		<span class="opacity-50">🇳🇱</span>
	</div>

	<p>Select your topic :</p>
	<ul>
		{#each files as file}
			<li><a href="/docs/{lang}/{file}" class="body-hyperlink" target="_blank">{file}</a></li>
		{/each}
	</ul>
</div>
