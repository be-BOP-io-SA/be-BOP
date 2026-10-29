<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<a href="{data.adminPrefix}/discount/new" class="underline block"
	>{t('admin.discount.addDiscount')}</a
>

<h1 class="text-3xl">{t('admin.discount.listOfDiscount')}</h1>
<ul>
	{#each data.discounts as discount}
		<li>
			<a href="{data.adminPrefix}/discount/{discount._id}" class="underline text-blue">
				{discount.name}
			</a>
			-
			<span class="text-gray-550">[{t('admin.discount.discountLabel', { id: discount._id })}]</span>
		</li>
	{:else}
		{t('admin.discount.noDiscountsYet')}
	{/each}
</ul>
