<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import { typedKeys } from '$lib/utils/typedKeys.js';

	const { t } = useI18n();

	export let data;

	const specialPages = {
		home: t('admin.cms.specialPage.home'),
		terms: t('admin.cms.specialPage.terms'),
		'why-vat-customs': t('admin.cms.specialPage.whyVatCustoms'),
		'why-collect-ip': t('admin.cms.specialPage.whyCollectIp'),
		'why-pay-remainder': t('admin.cms.specialPage.whyPayRemainder'),
		privacy: t('admin.cms.specialPage.privacy'),
		maintenance: t('admin.cms.specialPage.maintenance'),
		error: t('admin.cms.specialPage.error'),
		'order-top': t('admin.cms.specialPage.orderTop'),
		'order-bottom': t('admin.cms.specialPage.orderBottom'),
		'checkout-top': t('admin.cms.specialPage.checkoutTop'),
		'checkout-bottom': t('admin.cms.specialPage.checkoutBottom'),
		'cart-top': t('admin.cms.specialPage.cartTop'),
		'cart-bottom': t('admin.cms.specialPage.cartBottom'),
		agewall: t('admin.cms.specialPage.agewall')
	};

	const cmsPageMap = new Map(data.cmsPages.map((cmsPage) => [cmsPage._id, cmsPage]));
</script>

<a href="{data.adminPrefix}/cms/new" class="underline block body-hyperlink"
	>{t('admin.cms.addPage')}</a
>
<a href="{data.adminPrefix}/cms/seo-edit" class="underline block body-hyperlink"
	>{t('admin.cms.bulkSeoEdit')}</a
>

{#if typedKeys(specialPages).some((key) => cmsPageMap.has(key))}
	<h2 class="text-2xl">{t('admin.cms.existingSpecialPages')}</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">{t('admin.cms.pageSlug')}</th>
				<th class="text-left border border-gray-300 p-2">{t('admin.cms.pageTitle')}</th>
				<th class="text-left border border-gray-300 p-2">{t('admin.cms.description')}</th>
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
	<h2 class="text-2xl">{t('admin.cms.existingPages')}</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">{t('admin.cms.pageSlug')}</th>
				<th class="text-left border border-gray-300 p-2">{t('admin.cms.pageTitle')}</th>
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
	<h2 class="text-2xl">{t('admin.cms.suggestions')}</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">{t('admin.cms.pageSlug')}</th>
				<th class="text-left border border-gray-300 p-2">{t('admin.cms.description')}</th>
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
