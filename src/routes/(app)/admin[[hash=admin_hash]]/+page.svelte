<script>
	import { onMount } from 'svelte';
	let version = '';

	onMount(async () => {
		try {
			const res = await fetch('/.well-known/version.txt');
			version = await res.text();
		} catch (error) {
			console.error('Erreur de récupération de la version:', error);
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
		<span>🇬🇧</span>
		<span>🇫🇷</span>
		<span>🇮🇹</span>
		<span>🇪🇸</span>
		<span>🇳🇱</span>
	</div>

	<p>Select your topic :</p>
	<ul class="doc-list">
		<li>00 - initialize beBOP.md</li>
		<li>FAQ.md</li>
		<li>VAT-configuration.md</li>
		<li>admin-reporting.md</li>
		<li>age-restriction.md</li>
		<li>back-office-access.md</li>
		<li>bebop-manifesto.md</li>
		<li>bulk-picture-name.md</li>
		<li>challenge-widget.md</li>
		<li>configuration-bitcoin-nodeless.md</li>
		<li>countdown-widget.md</li>
		<li>customise-cart-checkout-order-with-CMS.md</li>
		<li>delivery-management.md</li>
		<li>downloadable-files.md</li>
		<li>form-widget.md</li>
		<li>gallery-widget.md</li>
		<li>language-configuration.md</li>
		<li>layout-design.md</li>
		<li>leaderboard-widget.md</li>
		<li>mobile-display.md</li>
		<li>nostr-configuration.md</li>
		<li>paypal-configuration.md</li>
		<li>phoenixd-configuration.md</li>
		<li>physical-shop.md</li>
		<li>picture-option.md</li>
		<li>point-of-sale-options.md</li>
		<li>pos-touch-screen.md</li>
		<li>price-product-bulk-change.md</li>
		<li>product-variation.md</li>
	</ul>
</div>
