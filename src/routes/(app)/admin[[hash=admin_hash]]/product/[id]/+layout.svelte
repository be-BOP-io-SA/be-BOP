<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<!-- <h1 class="text-3xl">Edit a product</h1> -->
<TabLinksHeader
	tabs={[
		{
			href: `${data.adminPrefix}/product/${data.product._id}`,
			name: t('admin.product.editProductTab')
		},
		{
			href: `${data.adminPrefix}/product/${data.product._id}/translations`,
			name: t('admin.product.translationsTab')
		},
		...(!data.product.payWhatYouWant &&
		!data.product.free &&
		!data.product.bookingSpec &&
		data.priceHistoryEnabled
			? [
					{
						href: `${data.adminPrefix}/product/${data.product._id}/price-history`,
						name: t('admin.product.priceHistoryTab')
					}
			  ]
			: []),
		...(data.product.type === 'subscription'
			? [
					{
						href: `${data.adminPrefix}/product/${data.product._id}/subscribers`,
						name: t('admin.product.subscribersTab')
					}
			  ]
			: [])
	]}
/>

<slot />
