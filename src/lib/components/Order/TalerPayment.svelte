<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
</script>

{#if payment.status === 'pending'}
	<ul class="payment-details-list">
		{#if payment.address}
			<li>
				<a href={payment.address} class="underline break-all" target="_blank">
					{t('checkout.taler.link')} (taler://...)
				</a>
			</li>
		{/if}
		{#if payment.talerOrderStatusUrl}
			<li>
				<a href={payment.talerOrderStatusUrl} class="underline break-all" target="_blank">
					{t('checkout.taler.merchantBackendLink')}
				</a>
			</li>
		{/if}
	</ul>
{/if}
