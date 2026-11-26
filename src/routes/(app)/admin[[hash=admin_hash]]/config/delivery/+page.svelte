<script lang="ts">
	import DeliveryFeesSelector from '$lib/components/DeliveryFeesSelector.svelte';
	import DeliveryFeesVatFields from '$lib/components/DeliveryFeesVatFields.svelte';
	import { deliveryFeesVatOf } from '$lib/cart';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	export let form;

	let mode: 'flatFee' | 'perItem' = data.deliveryFees.mode;
	let onlyPayHighest = data.deliveryFees.onlyPayHighest;
	let applyFlatFeeToEachItem = data.deliveryFees.applyFlatFeeToEachItem;
	const savedVat = deliveryFeesVatOf(data.deliveryFees);
	let vatIncludedReference = savedVat.included;
	let vatMode = savedVat.mode;
	let vatProfileId = savedVat.profileId ?? '';
	let deliveryVatRate = 0;

	let deliveryFees = data.deliveryFees.deliveryFees || {};
</script>

{#if form?.success}
	<p class="alert-success">{t('admin.config.valuesUpdated')}</p>
{/if}

<h1 class="text-3xl">{t('admin.config.deliveryFeesConfig')}</h1>

<form method="post" class="flex flex-col gap-4">
	<label class="checkbox-label">
		<input type="radio" bind:group={mode} class="form-radio" name="mode" value="flatFee" />
		{t('admin.config.flatFee')}
	</label>

	<label class="checkbox-label">
		<input type="radio" bind:group={mode} class="form-radio" name="mode" value="perItem" />
		{t('admin.config.feeDependingOnProduct')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="allowFreeForPOS"
			class="form-checkbox"
			checked={data.deliveryFees.allowFreeForPOS}
		/>
		{t('admin.config.allowVoidingDeliveryFeesOnPos')}
	</label>
	<h2 class="text-2xl">
		{mode === 'flatFee' ? t('admin.config.flatFeeConfig') : t('admin.config.productDeliveryFees')}
	</h2>

	{#if mode === 'perItem'}
		<p class="alert-info">
			{t('admin.config.perItemDeliveryFeesHint')}
		</p>

		<label class="checkbox-label">
			<input type="checkbox" class="form-checkbox" name="onlyPayHighest" checked={onlyPayHighest} />
			{t('admin.config.onlyPayHighestDeliveryFeeHint')}
		</label>
	{/if}

	{#if mode === 'flatFee'}
		<label class="checkbox-label">
			<input
				type="checkbox"
				class="form-checkbox"
				name="applyFlatFeeToEachItem"
				checked={applyFlatFeeToEachItem}
			/>
			{t('admin.config.applyFlatFeeToEachItem')}
		</label>
	{/if}

	<DeliveryFeesVatFields
		vatProfiles={data.vatProfiles}
		vatCountry={data.vatCountry}
		bind:vatMode
		bind:vatProfileId
		bind:vatIncludedReference
		bind:previewRate={deliveryVatRate}
	/>

	<DeliveryFeesSelector
		{deliveryFees}
		defaultCurrency={data.currencies.priceReference}
		{vatIncludedReference}
		vatRate={deliveryVatRate}
	/>

	<div>
		<button type="submit" class="btn btn-black self-start"> {t('admin.config.saveConfig')} </button>
	</div>
</form>
