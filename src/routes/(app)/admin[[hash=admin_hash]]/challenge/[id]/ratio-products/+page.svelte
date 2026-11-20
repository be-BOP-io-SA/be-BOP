<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
</script>

<h1 class="text-3xl">{t('admin.challenge.editRatioPerProduct')}</h1>
<form method="post" class="contents">
	{#each data.products.filter((prod) => !data.challenge.productIds?.length || data.challenge.productIds.includes(prod._id)) as product}
		<h1 class="text-xl">{product.name}</h1>
		<label class="form-label"
			>{t('admin.challenge.customRatio')}
			<input
				type="number"
				class="form-input"
				name="perProductRatio[{product._id}]"
				value={data.challenge.perProductRatio?.[product._id]
					? data.challenge.perProductRatio[product._id]
					: 100}
				min="0"
				step="any"
				max="100"
				required
			/>
		</label>
	{/each}
	<button type="submit" class="btn btn-black self-start">{t('admin.action.update')}</button>
</form>
