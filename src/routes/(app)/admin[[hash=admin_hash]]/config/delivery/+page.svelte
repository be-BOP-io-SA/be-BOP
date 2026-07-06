<script lang="ts">
	import DeliveryFeesSelector from '$lib/components/DeliveryFeesSelector.svelte';
	import { computeVatRate } from '$lib/utils/vat';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	export let form;

	let mode: 'flatFee' | 'perItem' = data.deliveryFees.mode;
	let onlyPayHighest = data.deliveryFees.onlyPayHighest;
	let applyFlatFeeToEachItem = data.deliveryFees.applyFlatFeeToEachItem;
	let vatIncludedReference = data.deliveryFees.vatIncludedReference ?? false;
	let vatProfileId = data.deliveryFees.vatProfileId ?? '';

	let deliveryFees = data.deliveryFees.deliveryFees || {};

	$: deliveryVatRate = computeVatRate({
		productVatProfileId: vatProfileId || undefined,
		vatProfiles: data.vatProfiles,
		bebopCountry: data.vatCountry,
		userCountry: data.vatCountry,
		vatSingleCountry: true
	});
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

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="vatIncludedReference"
			bind:checked={vatIncludedReference}
		/>
		{t('admin.config.useDeliveryFeesVatIncludedReference')}
	</label>

	<label class="form-label">
		{t('admin.config.vatProfileForDeliveryFees')}
		<select name="vatProfileId" class="form-input" bind:value={vatProfileId}>
			<option value="">{t('admin.config.useShopStandardVat')}</option>
			{#each data.vatProfiles as profile}
				<option value={profile._id}>{profile.name}</option>
			{/each}
		</select>
	</label>

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
