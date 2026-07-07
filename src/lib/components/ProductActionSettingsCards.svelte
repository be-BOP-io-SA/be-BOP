<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let eshopVisible: boolean;
	export let retailVisible: boolean;
	export let googleShoppingVisible: boolean;
	export let nostrVisible: boolean;
	export let eshopBasket: boolean;
	export let retailBasket: boolean;
	export let nostrBasket: boolean;

	const { t } = useI18n();
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
	<div
		class="border border-gray-300 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col gap-2"
	>
		<h4 class="font-semibold text-sm">{t('admin.productForm.eshopCardTitle')}</h4>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="eshopVisible"
				bind:checked={eshopVisible}
			/>
			{t('admin.productForm.productIsVisible')}
		</label>
		<label class="checkbox-label text-sm">
			<input type="checkbox" class="form-checkbox" name="eshopBasket" bind:checked={eshopBasket} />
			{t('admin.productForm.canBeAddedToBasket')}
		</label>
	</div>
	<div
		class="border border-gray-300 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col gap-2"
	>
		<h4 class="font-semibold text-sm">{t('admin.productForm.retailCardTitle')}</h4>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="retailVisible"
				bind:checked={retailVisible}
			/>
			{t('admin.productForm.productIsVisible')}
		</label>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="retailBasket"
				bind:checked={retailBasket}
			/>
			{t('admin.productForm.canBeAddedToBasket')}
		</label>
	</div>
	<div
		class="border border-gray-300 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col gap-2"
	>
		<h4 class="font-semibold text-sm">Google Shopping</h4>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="googleShoppingVisible"
				bind:checked={googleShoppingVisible}
			/>
			{t('admin.productForm.productIsVisible')}
		</label>
	</div>
	<div
		class="border border-gray-300 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex flex-col gap-2"
	>
		<h4 class="font-semibold text-sm">Nostr-bot</h4>
		<label class="checkbox-label text-sm">
			<input
				type="checkbox"
				class="form-checkbox"
				name="nostrVisible"
				bind:checked={nostrVisible}
			/>
			{t('admin.productForm.productIsVisible')}
		</label>
		<label class="checkbox-label text-sm">
			<input type="checkbox" class="form-checkbox" name="nostrBasket" bind:checked={nostrBasket} />
			{t('admin.productForm.canBeAddedToBasket')}
		</label>
	</div>
</div>
