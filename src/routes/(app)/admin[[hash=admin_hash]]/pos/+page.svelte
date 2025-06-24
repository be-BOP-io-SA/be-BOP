<script lang="ts">
	import { MultiSelect } from 'svelte-multiselect';
	export let data;

	let selectedTags =
		data.posTouchTag?.map((tagId) => ({
			value: tagId,
			label: data.tags.find((tag) => tag._id === tagId)?.name ?? tagId
		})) ?? [];

	$: serializedTags = JSON.stringify(selectedTags.map((tag) => tag.value));
	let posDisplayOrderQrAfterPayment = data.posDisplayOrderQrAfterPayment;
</script>

<h1 class="text-3xl">POS</h1>

<form method="post" class="flex flex-col gap-6">
	<!-- svelte-ignore a11y-label-has-associated-control -->
	<label class="form-label">
		Product Tags
		<MultiSelect
			--sms-options-bg="var(--body-mainPlan-backgroundColor)"
			options={data.tags.map((tag) => ({
				value: tag._id,
				label: tag.name
			}))}
			bind:selected={selectedTags}
		/>
	</label>
	<input type="hidden" name="posTouchTag" bind:value={serializedTags} />
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posPrefillTermOfUse"
			class="form-checkbox"
			checked={data.posPrefillTermOfUse}
		/>
		Pre-fill term of use checkbox in /checkout
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="notPrefillCheckoutAddress"
			class="form-checkbox"
			checked={data.notPrefillCheckoutAddress}
		/>
		Do no prefill checkout with shop address on PoS session
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="posDisplayOrderQrAfterPayment"
			class="form-checkbox"
			bind:checked={posDisplayOrderQrAfterPayment}
		/>
		Display order QR code on PoS after payment
	</label>
	{#if posDisplayOrderQrAfterPayment}
		<label class="form-label">
			set a time before redirecting to home

			<input
				type="number"
				step="1"
				name="posQrCodeAfterPayment.timeBeforeRedirecting"
				class="form-input"
				value={data.posQrCodeAfterPayment.timeBeforeRedirecting}
			/>
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="posQrCodeAfterPayment.displayCustomerCta"
				class="form-checkbox"
				checked={data.posQrCodeAfterPayment.displayCustomerCta}
			/>
			Display the customer CTA on PoS after payment
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="posQrCodeAfterPayment.removeBebobLogo"
				class="form-checkbox"
				checked={data.posQrCodeAfterPayment.removeBebobLogo}
			/>
			Remove be-BOP logo from POS after payment QR code
		</label>
	{/if}
	<input type="submit" value="Update" class="btn btn-blue self-start" />
</form>
