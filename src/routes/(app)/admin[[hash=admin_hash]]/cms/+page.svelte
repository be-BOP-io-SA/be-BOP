<script lang="ts">
	import { typedKeys } from '$lib/utils/typedKeys.js';

	export let data;

	const specialPages = {
		home: 'Replacement for the default home page. The catalog will still be available at /catalog',
		terms: 'Terms and conditions, will show at the checkout page.',
		'why-vat-customs': `If "Make VAT = 0% for deliveries outside seller's country" is enabled, this page will be linked to for foreign buyers to explain the 0% VAT.`,
		'why-collect-ip': `If "Request IP collection on deliveryless order" is enabled, this page will be linked to for buyers to explain the reason for collecting their IP.`,
		'why-pay-remainder': `If products with partial deposit are used, this page will be linked to for buyers when they agree to pay the remainder, during the checkout process.`,
		privacy: 'Privacy policy. A link to it is by default in the footer of the website.',
		maintenance: 'This page will be shown to visitors when the website is in maintenance mode.',
		error:
			'Users will be redirected to this page when a server error occurs. Completely optional, the redirect can be annoying to users.',
		'order-top':
			'This page will be embed at the top of the order page. It can be used to explain the ordering process.',
		'order-bottom':
			'This page will be embed at the bottom of the order page. It can be used to explain the ordering process.',
		'checkout-top':
			'This page will be embed at the top of the checkout page. It can be used to explain the checkout process.',
		'checkout-bottom':
			'This page will be embed at the bottom of the checkout page. It can be used to explain the checkout process.',
		'cart-top':
			'This page will be embed at the top of the cart page. It can be used to explain the cart process.',
		'cart-bottom':
			'This page will be embed at the bottom of the cart page. It can be used to explain the cart process.',
		agewall: 'This page will be embed in age limit form'
	};

	const cmsPageMap = new Map(data.cmsPages.map((cmsPage) => [cmsPage._id, cmsPage]));
</script>

<a href="{data.adminPrefix}/cms/new" class="underline block body-hyperlink">Add CMS page</a>
<a href="{data.adminPrefix}/cms/seo-edit" class="underline block body-hyperlink"
	>Bulk CMS SEO edit</a
>

{#if typedKeys(specialPages).some((key) => cmsPageMap.has(key))}
	<h2 class="text-2xl">Existing Special pages</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">Page slug</th>
				<th class="text-left border border-gray-300 p-2">Page title</th>
				<th class="text-left border border-gray-300 p-2">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each typedKeys(specialPages).filter((key) => cmsPageMap.has(key)) as specialPage}
				<tr>
					<td class="border border-gray-300 p-2">
						{#if cmsPageMap.get(specialPage)?.hasMobileContent}📱{:else}💻{/if}
						<a href="{data.adminPrefix}/cms/{specialPage}" class="underline body-hyperlink">
							{specialPage}
						</a>
					</td>
					<td class="border border-gray-300 p-2">{cmsPageMap.get(specialPage)?.title}</td>
					<td class="border border-gray-300 p-2">{specialPages[specialPage]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

{#if data.cmsPages.some((cmsPage) => !(cmsPage._id in specialPages))}
	<h2 class="text-2xl">Existing CMS pages</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">Page slug</th>
				<th class="text-left border border-gray-300 p-2">Page title</th>
			</tr>
		</thead>
		<tbody>
			{#each data.cmsPages.filter((cmsPage) => !(cmsPage._id in specialPages)) as cmsPage}
				<tr>
					<td class="border border-gray-300 p-2">
						{#if cmsPage.hasMobileContent}📱{:else}💻{/if}
						<a href="{data.adminPrefix}/cms/{cmsPage._id}" class="underline body-hyperlink">
							{cmsPage._id}
						</a>
					</td>
					<td class="border border-gray-300 p-2">{cmsPage.title}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

{#if typedKeys(specialPages).some((key) => !cmsPageMap.has(key))}
	<h2 class="text-2xl">Suggestions</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">Page slug</th>
				<th class="text-left border border-gray-300 p-2">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each typedKeys(specialPages).filter((key) => !cmsPageMap.has(key)) as specialPage}
				<tr>
					<td class="border border-gray-300 p-2">
						<a href="{data.adminPrefix}/cms/new?id={specialPage}" class="underline body-hyperlink">
							{specialPage}
						</a>
					</td>
					<td class="border border-gray-300 p-2">{specialPages[specialPage]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
