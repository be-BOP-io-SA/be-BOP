<script lang="ts">
	import type { SerializedOrderPayment } from '$lib/types/Order';
	import type { SellerIdentity } from '$lib/types/SellerIdentity';
	import CardPayment from './CardPayment.svelte';
	import BitcoinPayment from './BitcoinPayment.svelte';
	import LightningPayment from './LightningPayment.svelte';
	import BankTransferPayment from './BankTransferPayment.svelte';
	import PointOfSalePayment from './PointOfSalePayment.svelte';
	import PayPalPayment from './PayPalPayment.svelte';
	import PaymentQRCodes from './PaymentQRCodes.svelte';

	import { useI18n } from '$lib/i18n';
	import PriceTag from '$lib/components/PriceTag.svelte';

	const { t } = useI18n();

	export let payment: SerializedOrderPayment;
	export let orderId: string;
	export let posMode = false;
	export let hideCreditCardQrCode: boolean | undefined = undefined;
	export let sellerIdentity: SellerIdentity | null | undefined = undefined;
	export let posSubtypes: Array<{ slug: string; name: string }> | undefined = undefined;

	// Registry of dynamic components
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const paymentComponents: Record<string, any> = {
		card: CardPayment,
		bitcoin: BitcoinPayment,
		lightning: LightningPayment,
		'bank-transfer': BankTransferPayment,
		'point-of-sale': PointOfSalePayment,
		paypal: PayPalPayment
	};
</script>

<details
	class="payment-item border border-gray-300 rounded-xl p-4"
	open={posMode || payment.status === 'pending'}
>
	<summary class="lg:text-xl cursor-pointer">
		<span class="items-center inline-flex gap-2">
			{t(`checkout.paymentMethod.${payment.method}`)}

			{#if payment.method === 'point-of-sale' && payment.posSubtype}
				{@const subtype = posSubtypes?.find((s) => s.slug === payment.posSubtype)}
				<span class="text-sm text-gray-600">
					({subtype?.name || payment.posSubtype})
				</span>
			{/if}

			- <PriceTag
				inline
				class="break-words {payment.status === 'paid' ? 'text-green-500' : 'body-secondaryText'}"
				amount={payment.price.amount}
				currency={payment.price.currency}
			/>
			- {t(`order.paymentStatus.${payment.status}`)}
		</span>
	</summary>

	<div class="payment-content flex flex-col gap-2 mt-2">
		<!-- Dynamic component by payment method -->
		{#if payment.method !== 'point-of-sale' && paymentComponents[payment.method]}
			<svelte:component
				this={paymentComponents[payment.method]}
				{payment}
				{orderId}
				{sellerIdentity}
				{posMode}
			/>
		{:else if payment.method === 'point-of-sale'}
			<PointOfSalePayment />
		{/if}

		<!-- Actions (order controlled by CSS) -->
		<slot />

		<!-- QR codes -->
		{#if payment.status === 'pending'}
			<div class="qr-codes">
				<PaymentQRCodes {payment} {hideCreditCardQrCode} />
			</div>
		{/if}
	</div>
</details>

<style>
	/* POS mode: Receipt buttons BEFORE QR */
	:global(.pos-mode) .payment-content :global(.receipt-buttons) {
		order: 1;
	}
	:global(.pos-mode) .payment-content .qr-codes {
		order: 2;
	}
	:global(.pos-mode) .payment-content :global(.other-actions) {
		order: 3;
	}
</style>
