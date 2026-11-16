<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import type { Front } from '$lib/payment-processors/front';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let orderId: string;
	export let returnTo: string | undefined = undefined;
	export let front: Front | undefined = undefined;

	$: payUrl = returnTo
		? `/order/${orderId}/payment/${payment.id}/pay?returnTo=${encodeURIComponent(returnTo)}`
		: `/order/${orderId}/payment/${payment.id}/pay`;
</script>

{#if payment.status === 'pending'}
	<a href={payUrl} class="body-hyperlink">
		<span>{t('order.paymentLink')}</span>
		{#if front?.logo}
			<svg
				fill="currentColor"
				class="h-12 order-creditCard-svg"
				viewBox={front.logo.viewBox}
				xmlns="http://www.w3.org/2000/svg"
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html front.logo.body}
			</svg>
		{:else if payment.processor === 'paypal'}
			<img
				src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png"
				alt="PayPal"
				class="h-12"
			/>
		{:else if payment.processor}
			<span class="text-sm text-gray-500">{payment.processor}</span>
		{/if}
	</a>
{/if}
