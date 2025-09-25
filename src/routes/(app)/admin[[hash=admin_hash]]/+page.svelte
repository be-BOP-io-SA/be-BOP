<script lang="ts">
	import { PUBLIC_VERSION } from '$env/static/public';
	import { page } from '$app/stores';
	import Shepherd from 'shepherd.js';
	import { tick } from 'svelte';

	export let data;
	$: lang = new URL($page.url).searchParams.get('lang') || 'en';

	function setupTutorial() {
		const tour = new Shepherd.Tour({
			useModalOverlay: true,
			defaultStepOptions: {
				cancelIcon: {
					enabled: true
				},
				classes: 'shepherd-target',
				scrollTo: { behavior: 'smooth', block: 'center' }
			}
		});
		tour.addStep({
			title: 'Creating a product',
			text: 'The products menu is under the merch section',
			attachTo: {
				element: 'a[href="#Merch"]',
				on: 'bottom'
			},
			buttons: [
				{
					action() {
						return this.back();
					},
					classes: 'shepherd-button-secondary',
					text: 'Back'
				},
				{
					action() {
						(document.querySelector('a[href="#Merch"]') as HTMLAnchorElement)?.click();
						tick().then(this.next);
					},
					text: 'Continue'
				}
			],
			id: 'section'
		});
		tour.addStep({
			title: 'Creating a product',
			text: 'Click on the product admin page',
			attachTo: {
				element: 'a[href="/admin/product"]',
				on: 'bottom'
			},
			buttons: [
				{
					action() {
						return this.back();
					},
					classes: 'shepherd-button-secondary',
					text: 'Back'
				},
				{
					action() {
						(document.querySelector('a[href="/admin/product"]') as HTMLAnchorElement)?.click();
						setTimeout(() => tick().then(this.next), 300);
					},
					text: 'Continue'
				}
			],
			id: 'section'
		});
		tour.addStep({
			title: 'Creating a product',
			text: 'Go to create product page',
			attachTo: {
				element: 'a[href="/admin/product/new"]',
				on: 'bottom-start'
			},
			buttons: [
				{
					action() {
						return this.back();
					},
					classes: 'shepherd-button-secondary',
					text: 'Back'
				},
				{
					action() {
						(document.querySelector('a[href="/admin/product/new"]') as HTMLAnchorElement)?.click();
						tick().then(this.next);
					},
					text: 'Continue'
				}
			],
			id: 'section'
		});
		tour.start();
	}
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl">Back-office home</h1>
	<p>
		Welcome on be-BOP back-office! From here, you'll be able to manage, configure, and monitor your
		be-BOP.
	</p>

	<button class="btn btn-primary border-red-500 border-4 w-fit" on:click={setupTutorial}>
		Click me to start Shepherd tour!
	</button>

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
