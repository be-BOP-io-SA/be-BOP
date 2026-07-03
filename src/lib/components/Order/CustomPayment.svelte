<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';

	export let payment: SerializedOrderPayment;
	// Configured live in runtimeConfig.customPaymentMethod (issue #2259). No QR — the admin's
	// free-text instructions tell the customer how to pay; an admin validates the payment manually.
	export let customPaymentMethod: { label?: string; instructions?: string } | undefined = undefined;
</script>

{#if payment.status === 'pending' && customPaymentMethod?.instructions}
	<p class="whitespace-pre-line body-secondaryText">{customPaymentMethod.instructions}</p>
{/if}
