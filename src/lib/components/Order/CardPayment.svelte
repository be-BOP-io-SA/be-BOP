<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';
	import IconSumupWide from '$lib/components/icons/IconSumupWide.svelte';
	import IconStripe from '$lib/components/icons/IconStripe.svelte';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let orderId: string;
</script>

{#if payment.status === 'pending'}
	<a href="/order/{orderId}/payment/{payment.id}/pay" class="body-hyperlink">
		<span>{t('order.paymentLink')}</span>
		{#if payment.processor === 'sumup'}
			<IconSumupWide class="h-12" />
		{:else if payment.processor === 'stripe'}
			<IconStripe class="h-12" />
		{:else if payment.processor === 'paypal'}
			<img
				src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png"
				alt="PayPal"
				class="h-12"
			/>
		{/if}
	</a>
{/if}
