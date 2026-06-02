<script lang="ts">
	import DeliveryFeesSelector from '$lib/components/DeliveryFeesSelector.svelte';
	import { computeVatRate } from '$lib/utils/vat';
	import { enhance } from '$app/forms';

	export let data;
	export let form;

	let mode: 'flatFee' | 'perItem' = data.deliveryFees.mode;
	let onlyPayHighest = data.deliveryFees.onlyPayHighest;
	let applyFlatFeeToEachItem = data.deliveryFees.applyFlatFeeToEachItem;
	let vatIncludedReference = data.deliveryFees.vatIncludedReference ?? false;
	let vatProfileId = data.deliveryFees.vatProfileId ?? '';

	let deliveryFees = data.deliveryFees.deliveryFees || {};
	let deliveryZones = data.deliveryFees.deliveryZones ?? [];
	let defaultBlacklist = data.deliveryFees.defaultBlacklist ?? [];

	$: deliveryVatRate = computeVatRate({
		productVatProfileId: vatProfileId || undefined,
		vatProfiles: data.vatProfiles,
		bebopCountry: data.vatCountry,
		userCountry: data.vatCountry,
		vatSingleCountry: true
	});
</script>

{#if form?.success}
	<p class="alert-success">Values updated</p>
{/if}

{#if form?.error}
	<p class="alert-error">{form.error}</p>
{/if}

<h1 class="text-3xl">Delivery fees config</h1>

<form
	method="post"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
	class="flex flex-col gap-4"
>
	<label class="checkbox-label">
		<input type="radio" bind:group={mode} class="form-radio" name="mode" value="flatFee" />
		Flat fee
	</label>

	<label class="checkbox-label">
		<input type="radio" bind:group={mode} class="form-radio" name="mode" value="perItem" />
		Fee depending on product
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="allowFreeForPOS"
			class="form-checkbox"
			checked={data.deliveryFees.allowFreeForPOS}
		/>
		Allow voiding delivery fees on POS sale
	</label>
	<h2 class="text-2xl">
		{mode === 'flatFee' ? 'Flat fee config' : 'Product delivery fees'}
	</h2>

	{#if mode === 'perItem'}
		<p class="alert-info">
			Those delivery fees will be applied to your products, unless overriden inside the product
			itself.
		</p>

		<label class="checkbox-label">
			<input type="checkbox" class="form-checkbox" name="onlyPayHighest" checked={onlyPayHighest} />
			For orders with multiple products, only apply the delivery fee of the product with the highest
			delivery fee
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
			Apply flat fee for each item instead of once for the whole order
		</label>
	{/if}

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="vatIncludedReference"
			bind:checked={vatIncludedReference}
		/>
		Use delivery fees price reference as VAT included price instead of VAT excluded
	</label>

	<label class="form-label">
		VAT profile for delivery fees
		<select name="vatProfileId" class="form-input" bind:value={vatProfileId}>
			<option value="">Use shop standard VAT</option>
			{#each data.vatProfiles as profile}
				<option value={profile._id}>{profile.name}</option>
			{/each}
		</select>
	</label>

	<h2 class="text-2xl">Free delivery threshold</h2>

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="freeDeliveryThresholdEnabled"
			checked={data.deliveryFees.freeDeliveryThresholdEnabled}
		/>
		Enable free delivery above a cart amount threshold
	</label>

	<label class="form-label">
		Threshold amount (VAT included, in {data.currencies.main})
		<input
			type="number"
			min="0"
			step="any"
			class="form-input"
			name="freeDeliveryThreshold"
			value={data.deliveryFees.freeDeliveryThreshold ?? 0}
		/>
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			class="form-checkbox"
			name="showRemainingForFreeDelivery"
			checked={data.deliveryFees.showRemainingForFreeDelivery ?? true}
		/>
		Show customers the amount remaining to reach free delivery
	</label>

	<DeliveryFeesSelector
		{deliveryFees}
		{deliveryZones}
		{defaultBlacklist}
		defaultCurrency={data.currencies.priceReference}
		{vatIncludedReference}
		vatRate={deliveryVatRate}
	/>

	<div>
		<button type="submit" class="btn btn-black self-start"> Save config </button>
	</div>
</form>
