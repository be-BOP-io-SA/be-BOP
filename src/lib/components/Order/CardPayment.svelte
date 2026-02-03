<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';
	import IconSumupWide from '$lib/components/icons/IconSumupWide.svelte';
	import IconStripe from '$lib/components/icons/IconStripe.svelte';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let orderId: string;
	export let returnTo: string | undefined = undefined;

	$: payUrl = returnTo
		? `/order/${orderId}/payment/${payment.id}/pay?returnTo=${encodeURIComponent(returnTo)}`
		: `/order/${orderId}/payment/${payment.id}/pay`;
</script>

{#if payment.status === 'pending'}
	<a href={payUrl} class="body-hyperlink">
		<span>{t('order.paymentLink')}</span>
		{#if payment.processor === 'sumup'}
			<IconSumupWide class="h-12 order-creditCard-svg" />
		{:else if payment.processor === 'stripe'}
			<IconStripe class="h-12 order-creditCard-svg" />
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
