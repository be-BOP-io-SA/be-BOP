<script lang="ts">
	import { PAYMENT_METHOD_EMOJI, type SimplifiedOrder } from '$lib/types/Order';
	import PriceTag from './PriceTag.svelte';
	import { currencies } from '$lib/stores/currencies';
	import { useI18n } from '$lib/i18n';
	import OrderLabelComponent from './OrderLabelComponent.svelte';
	import type { OrderLabel } from '$lib/types/OrderLabel';

	export let orders:
		| Pick<
				SimplifiedOrder,
				| '_id'
				| 'payments'
				| 'number'
				| 'createdAt'
				| 'currencySnapshot'
				| 'status'
				| 'notes'
				| 'orderLabelIds'
		  >[]
		| [];
	export let adminPrefix: string | undefined = undefined;
	export let orderLabels: OrderLabel[] | undefined = undefined;
	$: labelById = orderLabels
		? Object.fromEntries(orderLabels.map((label) => [label._id, label]))
		: undefined;

	const { t, locale } = useI18n();
</script>

<ul class="flex flex-col gap-4">
	{#each orders as order}
		{@const status =
			order.status === 'pending'
				? order.payments.some((payment) => payment.status === 'paid')
					? 'partiallyPaid'
					: order.status
				: order.status}
		<li class="text-lg flex flex-wrap items-center gap-1">
			<a href="/order/{order._id}" class="body-hyperlink hover:underline">
				#{order.number.toLocaleString($locale)}
			</a>
			- {#each order.payments as payment}
				<span title={t('checkout.paymentMethod.' + payment.method)}
					>{PAYMENT_METHOD_EMOJI[payment.method]}</span
				>
			{:else}
				<span title={t('checkout.paymentMethod.free')}>{PAYMENT_METHOD_EMOJI['free']}</span>
			{/each} -
			<time datetime={order.createdAt.toJSON()} title={order.createdAt.toLocaleString($locale)}
				>{order.createdAt.toLocaleDateString($locale)}</time
			>
			- <PriceTag
				currency={order.currencySnapshot.main.totalPrice.currency}
				amount={order.currencySnapshot.main.totalPrice.amount}
			/>
			{#if adminPrefix}(<PriceTag
					currency={order.currencySnapshot.priceReference.totalPrice.currency}
					amount={order.currencySnapshot.priceReference.totalPrice.amount}
					convertedTo={$currencies.priceReference}
				/>){/if} -
			<span
				class={status === 'expired' || status === 'canceled'
					? 'text-gray-550'
					: status === 'paid' || status === 'partiallyPaid'
					? 'text-green-500'
					: ''}
			>
				{t('order.paymentStatus.' + status)}</span
			>
			{#if order.currencySnapshot.main.totalReceived && adminPrefix}
				- {t('pos.order.satReceived')}
				<PriceTag
					inline
					currency={order.currencySnapshot.main.totalReceived.currency}
					amount={order.currencySnapshot.main.totalReceived.amount}
				/>
			{/if}
			{#if order.notes?.length}
				-<a href="/order/{order._id}/notes" class="body-hyperlink hover:underline">📝</a>
			{/if}
			{#if adminPrefix}
				{#each order.payments as payment}
					{#if payment.status === 'pending' && (payment.method === 'point-of-sale' || payment.method === 'bank-transfer')}
						<form
							action="{adminPrefix}/order/{order._id}/payment/{payment.id}?/confirm"
							method="post"
							class="flex flex-row"
						>
							{#if payment.method === 'bank-transfer'}
								<input
									class="form-input grow mx-2"
									type="text"
									name="bankTransferNumber"
									required
									placeholder="bank transfer number"
								/>
							{/if}
							{#if payment.method === 'point-of-sale'}
								<input
									class="form-input grow mx-2"
									type="text"
									name="detail"
									required
									placeholder="Detail (card transaction ID, or point-of-sale payment method)"
								/>
							{/if}
							<button type="submit" class="btn btn-black whitespace-nowrap">Mark paid</button>
						</form>
						<form
							action="{adminPrefix}/order/{order._id}/payment/{payment.id}?/cancel"
							method="post"
						>
							<button type="submit" class="btn btn-red">Cancel</button>
						</form>
					{/if}
				{/each}
				{#if order.orderLabelIds?.length && labelById}
					{#each order.orderLabelIds as labelId}
						<OrderLabelComponent orderLabel={labelById[labelId]} class="text-sm" />
					{/each}
				{/if}
				<a
					href="{adminPrefix}/order/{order._id}/label"
					class="bg-gray-200 px-2 rounded-full"
					title="add label">+</a
				>
			{/if}
		</li>
	{:else}
		<li>{t('order.noOrdersYet')}</li>
	{/each}
</ul>
