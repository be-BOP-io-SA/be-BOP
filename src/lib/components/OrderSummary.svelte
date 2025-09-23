<script lang="ts">
	import type { CartPriceInfo } from '$lib/cart';
	import { useI18n } from '$lib/i18n';
	import {
		orderAmountWithNoPaymentsCreated,
		type Order,
		type OrderPayment,
		PAYMENT_METHOD_EMOJI
	} from '$lib/types/Order';
	import type { Picture } from '$lib/types/Picture';
	import type { Product } from '$lib/types/Product';
	import PictureComponent from './Picture.svelte';
	import PriceTag from './PriceTag.svelte';
	import ProductType from './ProductType.svelte';
	import IconInfo from './icons/IconInfo.svelte';
	import type { PickDeep } from 'type-fest';

	const { t, countryName, locale } = useI18n();

	let classNames = '';
	export { classNames as class };
	export let order: Pick<Order, 'shippingPrice' | 'vat' | 'discount' | 'currencySnapshot'> & {
		items: Array<
			Pick<
				Order['items'][0],
				| 'currencySnapshot'
				| 'quantity'
				| 'depositPercentage'
				| 'discountPercentage'
				| 'freeQuantity'
			> & {
				digitalFiles: Array<{ _id: string }>;
				picture?: Picture;
				product: PickDeep<
					Product,
					| '_id'
					| 'name'
					| 'preorder'
					| 'availableDate'
					| 'type'
					| 'shipping'
					| 'isTicket'
					| 'variationLabels'
					| 'bookingSpec.slotMinutes'
				>;
				chosenVariations: Record<string, string> | undefined;
				booking?: {
					start: Date;
					end: Date;
				};
			}
		>;
		payments: Array<Pick<OrderPayment, 'currencySnapshot' | 'status' | 'method'>>;
	};
	export let orderPriceInfo: CartPriceInfo;
	$: validDeposits = order.payments.filter(
		(p) =>
			p.currencySnapshot.main.price.amount < order.currencySnapshot.main.totalPrice.amount &&
			(p.status === 'paid' || p.status === 'pending')
	);
	$: invalidDeposits = order.payments.filter(
		(p) =>
			p.currencySnapshot.main.price.amount < order.currencySnapshot.main.totalPrice.amount &&
			(p.status === 'expired' || p.status === 'canceled')
	);
</script>

<article
	class="{classNames} rounded p-3 border border-gray-300 flex flex-col overflow-hidden gap-1"
>
	<div class="flex justify-between">
		{t('checkout.numProducts', { count: order.items.length ?? 0 })}
	</div>
	{#each order.items as item, i}
		<a href="/product/{item.product._id}">
			<h3 class="text-base">
				{item.chosenVariations
					? item.product.name +
					  ' - ' +
					  Object.entries(item.chosenVariations)
							.map(([key, value]) => item.product.variationLabels?.values[key][value])
							.join(' - ')
					: item.product.name}
			</h3>
		</a>

		<div class="flex flex-row gap-2">
			<a
				href="/product/{item.product._id}"
				class="w-[50px] h-[50px] min-w-[50px] min-h-[50px] rounded flex items-center"
			>
				{#if item.picture}
					<PictureComponent
						picture={item.picture}
						class="rounded grow object-cover h-full w-full"
						sizes="50px"
					/>
				{/if}
			</a>
			<div class="flex flex-col">
				<div class="flex flex-wrap mb-1 gap-3">
					<ProductType
						product={item.product}
						class="text-sm hidden"
						hasDigitalFiles={item.digitalFiles.length >= 1}
						depositPercentage={item.depositPercentage}
					/>
				</div>
				<div>
					{#if item.quantity > 1}
						{t('cart.quantity')}: {item.quantity}
					{/if}
					{#if item.booking}
						{Intl.DateTimeFormat($locale, {
							year: 'numeric',
							month: 'short',
							day: 'numeric',
							hour: '2-digit',
							minute: '2-digit'
						}).formatRange(item.booking.start, item.booking.end)}
					{/if}
				</div>
			</div>

			<div class="flex flex-col ml-auto items-end justify-center">
				<div class="flex gap-2">
					<PriceTag
						class="text-2xl truncate {item.discountPercentage ? 'line-through' : ''}"
						amount={orderPriceInfo.perItem[i].unitsToBill *
							(item.currencySnapshot.main.customPrice?.amount ??
								item.currencySnapshot.main.price.amount)}
						currency={item.currencySnapshot.main.customPrice?.currency ??
							item.currencySnapshot.main.price.currency}
						short={!!item.discountPercentage}
					/>
					{#if item.discountPercentage}
						<PriceTag
							class="text-2xl truncate"
							amount={orderPriceInfo.perItem[i].unitsToBill *
								(item.currencySnapshot.main.customPrice?.amount ??
									item.currencySnapshot.main.price.amount) *
								(item.discountPercentage ? (100 - item.discountPercentage) / 100 : 1)}
							currency={item.currencySnapshot.main.customPrice?.currency ??
								item.currencySnapshot.main.price.currency}
						/>
					{/if}
				</div>
				{#if item.currencySnapshot.secondary}
					<PriceTag
						class="text-2xl truncate"
						amount={orderPriceInfo.perItem[i].unitsToBill *
							(item.currencySnapshot.secondary.customPrice?.amount ??
								item.currencySnapshot.secondary.price.amount) *
							(item.discountPercentage ? (100 - item.discountPercentage) / 100 : 1)}
						currency={item.currencySnapshot.secondary.customPrice?.currency ??
							item.currencySnapshot.secondary.price.currency}
					/>
				{/if}
			</div>
		</div>

		<div class="border-b border-gray-300 col-span-4" />
	{/each}

	{#if order.shippingPrice?.amount}
		<div class="flex justify-between items-center">
			<h3 class="text-base">{t('checkout.deliveryFees')}</h3>

			<div class="flex flex-col ml-auto items-end justify-center">
				{#if order.currencySnapshot.main.shippingPrice}
					<PriceTag
						class="text-2xl truncate"
						amount={order.currencySnapshot.main.shippingPrice.amount}
						currency={order.currencySnapshot.main.shippingPrice.currency}
					/>
				{/if}
				{#if order.currencySnapshot.secondary?.shippingPrice}
					<PriceTag
						amount={order.currencySnapshot.secondary.shippingPrice.amount}
						currency={order.currencySnapshot.secondary.shippingPrice.currency}
						class="text-base truncate"
						secondary
					/>
				{/if}
			</div>
		</div>
		<div class="border-b border-gray-300 col-span-4" />
	{/if}

	{#each order.vat || [] as vat, i}
		<div class="flex justify-between items-center">
			<h3 class="text-base flex items-center gap-2">
				{t('cart.vat')} ({vat.rate}%)
				<div title={t('cart.vatRate', { country: countryName(vat.country) })}>
					<IconInfo class="cursor-pointer" />
				</div>
			</h3>

			<div class="flex flex-col ml-auto items-end justify-center">
				{#if order.currencySnapshot.main.vat}
					<PriceTag
						class="text-2xl truncate"
						amount={order.currencySnapshot.main.vat[i].amount}
						currency={order.currencySnapshot.main.vat[i].currency}
					/>
				{/if}
				{#if order.currencySnapshot.secondary?.vat}
					<PriceTag
						amount={order.currencySnapshot.secondary.vat[i].amount}
						currency={order.currencySnapshot.secondary.vat[i].currency}
						class="text-base truncate"
					/>
				{/if}
			</div>
		</div>
		<div class="border-b border-gray-300 col-span-4" />
	{/each}

	{#if order?.discount}
		<div class="flex justify-between items-center">
			<h3 class="text-base flex items-center gap-2">
				{t('order.discount.title')}
			</h3>

			<div class="flex flex-col ml-auto items-end justify-center">
				{#if order.currencySnapshot.main.discount}
					<PriceTag
						class="text-2xl truncate"
						amount={order.currencySnapshot.main.discount.amount}
						currency={order.currencySnapshot.main.discount.currency}
					/>
				{/if}
				{#if order.currencySnapshot.secondary?.discount}
					<PriceTag
						amount={order.currencySnapshot.secondary.discount.amount}
						currency={order.currencySnapshot.secondary.discount.currency}
						class="text-base truncate"
					/>
				{/if}
			</div>
		</div>
		<div class="border-b border-gray-300 col-span-4" />
	{/if}

	<span class="py-1" />

	<div class="py-3 flex flex-col">
		<div class="flex justify-between">
			<span class="text-xl">{t('cart.total')}</span>
			<PriceTag
				class="text-2xl"
				amount={order.currencySnapshot.main.totalPrice.amount}
				currency={order.currencySnapshot.main.totalPrice.currency}
			/>
		</div>
		{#if order.currencySnapshot.secondary?.totalPrice}
			<PriceTag
				class="self-end"
				amount={order.currencySnapshot.secondary.totalPrice.amount}
				currency={order.currencySnapshot.secondary.totalPrice.currency}
			/>
		{/if}
	</div>

	{#each validDeposits as payment}
		<div class="py-3 flex flex-col">
			<div class="flex justify-between">
				<span class="text-xl"
					><span title={t('checkout.paymentMethod.' + payment.method)}
						>{PAYMENT_METHOD_EMOJI[payment.method]}</span
					>
					- {payment.status === 'paid' ? t('order.depositPaid') : t('order.depositToPay')}
				</span>
				<PriceTag
					class="text-2xl"
					amount={payment.currencySnapshot.main.price.amount}
					currency={payment.currencySnapshot.main.price.currency}
				/>
			</div>
			{#if payment.currencySnapshot.secondary}
				<PriceTag
					class="self-end"
					amount={payment.currencySnapshot.secondary.price.amount}
					currency={payment.currencySnapshot.secondary.price.currency}
				/>
			{/if}
		</div>
	{/each}

	{#if orderAmountWithNoPaymentsCreated(order)}
		{@const remaining = orderAmountWithNoPaymentsCreated(order)}
		<div class="py-3 flex flex-col">
			<div class="flex justify-between">
				<span class="text-xl">{t('order.restToPay')}</span>
				<PriceTag
					class="text-2xl"
					amount={remaining}
					currency={order.currencySnapshot.main.totalPrice.currency}
				/>
			</div>
			{#if order.currencySnapshot.secondary?.totalPrice}
				<PriceTag
					class="self-end"
					amount={remaining}
					currency={order.currencySnapshot.main.totalPrice.currency}
					convertedTo={order.currencySnapshot.secondary.totalPrice.currency}
				/>
			{/if}
		</div>
	{/if}

	{#if invalidDeposits.length}
		<div class="border-t border-gray-300 col-span-4" />

		{#each invalidDeposits as payment}
			<div class="py-3 flex flex-col">
				<div class="flex justify-between">
					<span class="text-xl"
						><span title={t('checkout.paymentMethod.' + payment.method)}
							>{PAYMENT_METHOD_EMOJI[payment.method]}</span
						>
						- {payment.status === 'canceled'
							? t('order.depositCancelled')
							: t('order.depositExpired')}
					</span>
					<PriceTag
						class="text-2xl"
						amount={payment.currencySnapshot.main.price.amount}
						currency={payment.currencySnapshot.main.price.currency}
					/>
				</div>
				{#if payment.currencySnapshot.secondary}
					<PriceTag
						class="self-end"
						amount={payment.currencySnapshot.secondary.price.amount}
						currency={payment.currencySnapshot.secondary.price.currency}
					/>
				{/if}
			</div>
		{/each}
	{/if}
</article>
