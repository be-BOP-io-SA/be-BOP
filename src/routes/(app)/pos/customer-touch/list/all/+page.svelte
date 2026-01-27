<script lang="ts">
	import CustomerTouchProduct from '$lib/components/CustomerTouchProduct.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	$: picturesByProduct = Object.fromEntries(
		[...data.pictures].reverse().map((picture) => [picture.productId, picture])
	);
</script>

<main class="flex flex-col bg-gray-100 border rounded-lg">
	<div class="p-2 text-center">
		<h2 class="text-3xl font-bold text-gray-900 mb-4">{t('customerTouch.nav.allProducts')}</h2>
		<div class="grid grid-cols-3 gap-2 content-start h-[90vh] overflow-scroll">
			{#each data.products as product}
				<CustomerTouchProduct {product} picture={picturesByProduct[product._id]} />
			{/each}
		</div>
	</div>
</main>
