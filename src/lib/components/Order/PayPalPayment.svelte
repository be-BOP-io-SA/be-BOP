<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let orderId: string;
	export let returnTo: string | undefined = undefined;

	$: payUrl = returnTo
		? `/order/${orderId}/payment/${payment.id}/pay?returnTo=${encodeURIComponent(returnTo)}`
		: `/order/${orderId}/payment/${payment.id}/pay`;
</script>

{#if payment.status === 'pending'}
	<a href={payUrl} class="paypal-payment-link body-hyperlink flex items-center gap-2">
		<img
			src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png"
			alt="PayPal"
			class="h-12"
		/>
		<span class="paypal-text-normal">{t('order.paymentLink')}</span>
		<span class="paypal-text-pos">{t('pos.touch.pay')}</span>
	</a>
{/if}

<style>
	/* Hide POS text by default, show normal */
	.paypal-text-pos {
		display: none;
	}

	/* In POS mode: hide normal, show POS text as black button */
	:global(.pos-mode) .paypal-payment-link {
		text-decoration: none;
	}
	:global(.pos-mode) .paypal-text-pos {
		display: inline-block;
		background-color: black;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
	}

	:global(.pos-mode) .paypal-text-normal {
		display: none;
	}
</style>
