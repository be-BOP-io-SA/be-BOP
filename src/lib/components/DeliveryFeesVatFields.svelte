<script lang="ts">
	import { DELIVERY_FEES_VAT_MODES, type DeliveryFeesVatMode } from '$lib/cart';
	import type { CountryAlpha2 } from '$lib/types/Country';
	import { computeVatRate } from '$lib/utils/vat';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	// The VAT settings of one delivery fee, kept in one place so that each delivery method can
	// show its own once a shop offers several.
	export let vatProfiles: Array<{
		_id: string;
		name: string;
		rates: Partial<Record<CountryAlpha2, number>>;
	}>;
	export let vatCountry: CountryAlpha2 | undefined;
	export let vatMode: DeliveryFeesVatMode;
	export let vatProfileId: string;
	export let vatIncludedReference: boolean;
	/** The rate the fees will carry, or 0 when it depends on the cart. */
	export let previewRate = 0;

	$: previewRate =
		vatMode === 'standard' || vatMode === 'custom'
			? computeVatRate({
					productVatProfileId: vatMode === 'custom' ? vatProfileId || undefined : undefined,
					vatProfiles,
					bebopCountry: vatCountry,
					userCountry: vatCountry,
					vatSingleCountry: true
			  })
			: 0;
</script>

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
	{t('admin.config.deliveryFeesVatMode')}
	<select name="vatMode" class="form-input" bind:value={vatMode}>
		{#each DELIVERY_FEES_VAT_MODES as mode}
			<option value={mode}>{t(`admin.config.deliveryFeesVatModes.${mode}`)}</option>
		{/each}
	</select>
</label>

{#if vatMode === 'custom'}
	<label class="form-label">
		{t('admin.config.vatProfileForDeliveryFees')}
		<select name="vatProfileId" class="form-input" bind:value={vatProfileId} required>
			<option value="" disabled></option>
			{#each vatProfiles as profile}
				<option value={profile._id}>{profile.name}</option>
			{/each}
		</select>
	</label>
{/if}
