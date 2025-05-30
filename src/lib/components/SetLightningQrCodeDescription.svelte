<script lang="ts">
	export let invoiceDescription: 'orderUrl' | 'brand' | 'brandAndOrderNumber' | 'none';
	export let brandName: string;
	export let showThirdPartyWarning: boolean;
</script>

<p>
	You can set the label that will be added to the QR code for each invoice. This can be useful to
	identify the payment for the user, but it will also increase the size of the QR code.
</p>

{#if showThirdPartyWarning}
	<div class="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
		<p class="text-yellow-800">
			<strong>Warning:</strong> The label added to the QR code of the invoice will be communicated to
			third parties when processing Lightning payments.
		</p>
	</div>
{/if}

<form method="POST" action="?/updateLightningInvoiceDescription">
	<label class="checkbox-label">
		<input
			type="radio"
			name="qrCodeDescription"
			value="none"
			class="form-radio"
			bind:group={invoiceDescription}
		/> No extra info in QR code
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			name="qrCodeDescription"
			value="brand"
			class="form-radio"
			bind:group={invoiceDescription}
		/>
		"{brandName}" added to QR code
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			name="qrCodeDescription"
			value="brandAndOrderNumber"
			class="form-radio"
			bind:group={invoiceDescription}
		/>
		"{brandName} - Order #X" added to QR code
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			name="qrCodeDescription"
			value="orderUrl"
			class="form-radio"
			bind:group={invoiceDescription}
		/> Order URL added to QR code
	</label>

	<button type="submit" class="btn btn-black mt-2">Update</button>
</form>
