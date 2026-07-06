<script lang="ts">
	import ProductVATCalcRow from '$lib/components/ProductVATCalcRow.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	let displayVATCalculator = false;
</script>

<h1 class="text-3xl">{t('admin.product.bulkPriceChangeTitle')}</h1>

<label class="checkbox-label">
	<input
		class="form-checkbox"
		type="checkbox"
		name="vatCalculator"
		bind:checked={displayVATCalculator}
	/>
	{t('admin.product.displayVatCalculator')}
</label>

<form class="flex flex-col gap-2" method="post">
	{#each data.products as product}
		<ProductVATCalcRow
			productId={product._id}
			productName={product.name}
			initialPrice={product.price}
			{displayVATCalculator}
		/>
	{/each}
	<button class="btn btn-black self-start mt-4" type="submit">{t('admin.action.update')}</button>
</form>
