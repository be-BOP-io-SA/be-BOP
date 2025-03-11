<script lang="ts">
	import Picture from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import { useI18n } from '$lib/i18n.js';
	import { invoiceNumberVariables, orderRemainingToPay } from '$lib/types/Order.js';
	import { sum } from '$lib/utils/sum.js';
	import { marked } from 'marked';

	export let data;

	const { t, locale, textAddress } = useI18n();

	const identity = data.sellerIdentity;

	const differentAddress =
		data.order.shippingAddress &&
		data.order.billingAddress &&
		textAddress(data.order.shippingAddress) !== textAddress(data.order.billingAddress);

	const totalVat = {
		currency: data.order.currencySnapshot.main.totalPrice.currency,
		amount: sum(data.order.currencySnapshot.main.vat?.map((vat) => vat.amount) ?? [0])
	};
	const lastPayment = data.order.payments.find(
		(payment) => !payment.currencySnapshot.main.remainingToPay?.amount
	);
</script>

<div class="flex justify-between">
	<Picture picture={data.logoPicture} class="h-16" />
	<h2 class="text-xl whitespace-pre-line text-right">
		{identity.invoice?.issuerInfo || ''}
	</h2>
</div>

<div class="mt-4 mx-4">
	<p>{identity.businessName}</p>
	{#if identity.vatNumber}
		<p>VAT Number: {identity.vatNumber}</p>
	{/if}
	{#if identity.address.street}
		<p>{identity.address.street}</p>
	{/if}
	{#if identity.address.city || identity.address.zip}
		<p>{identity.address.zip} {identity.address.city}</p>
	{/if}
</div>

<div class="mt-4 mx-4 text-right">
	{#if data.order.notifications.paymentStatus.email}
		<!-- <p>{data.order.notifications.paymentStatus.email}</p> -->
	{/if}
	{#if data.order.billingAddress}
		{#if differentAddress}
			<p class="font-bold">{t('checkout.billingInfo')}</p>
		{/if}
		<p class="whitespace-pre-line">{textAddress(data.order.billingAddress)}</p>
		{#if data.order.shippingAddress && differentAddress}
			<br />
			<p class="font-bold">{t('order.shippingAddress.title')}</p>
			<p class="whitespace-pre-line">{textAddress(data.order.shippingAddress)}</p>
		{/if}
	{/if}
</div>

<div class="mt-4 mx-4">
	<h2 class="text-2xl">{t('order.receipt.summaryTitle', { number: data.order.number })}</h2>
	<Trans key="order.createdAt">
		<time datetime={data.order.createdAt.toJSON()} slot="0">
			{data.order.createdAt.toLocaleDateString($locale)}
		</time>
	</Trans><br />
	{#if lastPayment && lastPayment.status === 'paid'}
		<Trans key="order.paidAt">
			<time datetime={lastPayment.paidAt?.toJSON()} slot="0">
				{lastPayment.paidAt?.toLocaleDateString($locale)}
			</time>
		</Trans>
	{/if}
	{#if orderRemainingToPay(data.order)}
		{@const remaining = orderRemainingToPay(data.order)}
		<h2 class="text-xl font-bold text-orange-500">
			{t('order.receipt.remainingAmount')}
			<PriceTag
				amount={remaining}
				currency={data.order.currencySnapshot.main.totalPrice.currency}
				inline
			/>
		</h2>
	{:else}
		<h2 class="text-xl font-bold text-green-500">
			{t('order.summary.fullyPaid.title')}
		</h2>
	{/if}
</div>

<table class="mt-4 mx-4 border-collapse">
	<thead style:background-color="#aeaaaa" class="text-white">
		<tr>
			<th class="text-center border border-white">N°</th>
			<th class="text-center border border-white">{t('order.receipt.itemName')}</th>
			<th class="text-center border border-white">{t('order.receipt.quantity')}</th>
			<th class="text-center border border-white">{t('order.receipt.unitPrice')}</th>
			<th class="text-center border border-white">{t('cart.vat')} (%)</th>
			<th class="text-center border border-white">{t('cart.vat')}</th>
			<th class="text-center border border-white">{t('order.receipt.totalInclVat')}</th>
		</tr>
	</thead>
	<tbody>
		{#each data.order.items as item, i}
			{@const price =
				item.currencySnapshot.main.customPrice?.amount ?? item.currencySnapshot.main.price.amount}
			<!--{@const unitPrice = price / item.quantity}-->
			{@const priceCurrency =
				item.currencySnapshot.main.customPrice?.currency ??
				item.currencySnapshot.main.price.currency}
			<tr style:background-color={i % 2 === 0 ? '#fef2cc' : '#e7e6e6'}>
				<td class="text-center border border-white px-2">{i + 1}</td>
				<td class="text-center border border-white px-2"
					>{item.chosenVariations
						? item.product.name +
						  ' - ' +
						  Object.entries(item.chosenVariations)
								.map(([key, value]) => item.product.variationLabels?.values[key][value])
								.join(' - ')
						: item.product.name}</td
				>
				<td class="text-center border border-white px-2">{item.quantity}</td>
				<td class="text-center border border-white px-2">
					<PriceTag amount={price} currency={priceCurrency} inline />
				</td>
				<td class="text-center border border-white px-2">{item.vatRate ?? 0}%</td>
				<td class="text-center border border-white px-2">
					<PriceTag amount={(price * (item.vatRate ?? 0)) / 100} currency={priceCurrency} inline />
				</td>
				<td class="text-right border border-white px-2">
					<PriceTag
						amount={price * item.quantity + (price * (item.vatRate ?? 0)) / 100}
						currency={priceCurrency}
						inline
					/>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<table class="mt-4 mx-4 border-collapse">
	<tr style:background-color="#fef2cc">
		<td class="border border-white px-2 text-right" style="width: 70%"
			>{t('order.receipt.totalExcVat')}</td
		>
		<td class="border border-white px-2 text-right whitespace-nowrap">
			<PriceTag
				amount={data.order.currencySnapshot.main.totalPrice.amount - totalVat.amount}
				currency={data.order.currencySnapshot.main.totalPrice.currency}
				inline
			/>
		</td>
	</tr>
	{#if data.order.shippingPrice && data.order.currencySnapshot.main.shippingPrice}
		<tr style:background-color="#e7e6e6">
			<td class="border border-white px-2 text-right">{t('checkout.deliveryFees')}</td>
			<td class="border border-white px-2 text-right whitespace-nowrap">
				<PriceTag
					amount={data.order.currencySnapshot.main.shippingPrice.amount}
					currency={data.order.currencySnapshot.main.shippingPrice.currency}
					inline
				/>
			</td>
		</tr>
	{/if}
	<tr style:background-color="#e7e6e6">
		<td class="border border-white px-2 text-right">{t('order.receipt.totalVat')}</td>
		<td class="border border-white px-2 text-right whitespace-nowrap">
			<PriceTag amount={totalVat.amount} currency={totalVat.currency} inline />
		</td>
	</tr>
	<tr style:background-color="#aeaaaa" class="text-white font-bold">
		<td class="border border-white px-2 text-right">{t('order.receipt.totalInclVat')}</td>
		<td class="border border-white px-2 whitespace-nowrap text-right">
			<PriceTag
				amount={data.order.currencySnapshot.main.totalPrice.amount}
				currency={data.order.currencySnapshot.main.totalPrice.currency}
				inline
			/>
		</td>
	</tr>
</table>

<div class="mt-4 mx-4">
	<h2 class="text-2xl">{t('order.related.title')}</h2>
	{#each data.order.payments as payment}
		<div>
			{payment.invoice
				? t('order.related.invoice', {
						invoiceNumber: t(
							'order.receipt.invoiceNumber',
							invoiceNumberVariables(data.order, payment)
						)
				  })
				: payment.status === 'pending'
				? t('order.related.invoicePending', {
						invoiceNumber: t(
							'order.receipt.proformaInvoiceNumber',
							invoiceNumberVariables(data.order, payment)
						)
				  })
				: t('order.related.invoiceFailed', {
						invoiceNumber: t(
							'order.receipt.proformaInvoiceNumber',
							invoiceNumberVariables(data.order, payment)
						)
				  })} -
			<PriceTag
				amount={payment.currencySnapshot.main.price.amount}
				currency={payment.currencySnapshot.main.price.currency}
				inline
			/> - {t('order.paidWithSummary.' + payment.method)} - {t(
				`order.paymentStatus.${payment.status}`
			)}
		</div>
	{/each}
</div>

{#if data.order.vatFree?.reason}
	<div class="mt-4 mx-4">
		{t('order.receipt.vatFreeReason', { reason: data.order.vatFree.reason })}
	</div>
{/if}

<div class="mt-4 mx-4">
	<Trans key="order.receipt.endMessage" params={{ businessName: identity.businessName }}>
		<br slot="0" />
		<br slot="1" />
	</Trans>
</div>

{#if identity.bank}
	<div class="mt-4 mx-4 text-right">
		<h2 class="text-xl">{t('order.receipt.bankInfo')} :</h2>
		<table class="ml-auto">
			<tr><td class="px-2">IBAN</td><td>{identity.bank.iban}</td></tr>
			<tr><td class="px-2">BIC</td><td>{identity.bank.bic}</td></tr>
		</table>
	</div>
{/if}

{#if data.order.receiptNote}
	<div class="mt-4 mx-4 text-center">
		<p>
			<!-- eslint-disable svelte/no-at-html-tags -->
			{@html marked(data.order.receiptNote.replaceAll('<', '&lt;'))}
		</p>
	</div>
{/if}
