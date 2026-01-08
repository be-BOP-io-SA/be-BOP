<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import type { SellerIdentity } from '$lib/types/SellerIdentity';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let sellerIdentity: SellerIdentity | undefined = undefined;

	$: bank = sellerIdentity?.bank;
</script>

{#if payment.status === 'pending'}
	<ul class="payment-details-list">
		{#if bank}
			<li>
				<strong>{t('order.paymentAccountHolder')}</strong>
				<p class="body-secondaryText">{bank.accountHolder}</p>
			</li>

			{#if bank.accountHolderAddress}
				<li>
					<strong>{t('order.paymentAccountHolderAddress')}</strong>
					<p class="body-secondaryText whitespace-pre-line">{bank.accountHolderAddress}</p>
				</li>
			{/if}

			<li>
				<strong>{t('order.paymentIban')}</strong>
				<code class="break-all">
					{bank.iban?.replace(/(.{4})/g, '$1 ')}
				</code>
			</li>

			<li>
				<strong>{t('order.paymentBic')}</strong>
				<code>{bank.bic}</code>
			</li>
		{/if}
	</ul>

	<!-- Email seller button -->
	{#if sellerIdentity?.contact.email}
		<a href="mailto:{sellerIdentity.contact.email}" class="btn btn-black self-start">
			{t('order.informSeller')}
		</a>
	{/if}
{/if}
