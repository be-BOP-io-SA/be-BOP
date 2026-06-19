<script lang="ts">
	import PriceHistoryView from '$lib/components/PriceHistoryView.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	$: product = data.product;
	// Reuse the existing public endpoint for the CSV export (staff-gated server-side).
	$: csvHref = `/product/${encodeURIComponent(product._id)}/price-history?format=csv`;
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
	<h2 class="text-xl">{t('priceCalendar.tabHistory')}</h2>
	<a class="btn btn-gray" href={csvHref} download>{t('priceCalendar.exportCsv')}</a>
</div>

<PriceHistoryView productId={product._id} currency={product.price.currency} />
