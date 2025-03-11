<script lang="ts">
	import Picture from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import { useI18n } from '$lib/i18n.js';
	import { invoiceNumberVariables } from '$lib/types/Order.js';
	import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';
	import { sum } from '$lib/utils/sum.js';
	import { sumCurrency } from '$lib/utils/sumCurrency.js';
	import { marked } from 'marked';

	export let data;

	const { t, locale, textAddress, countryName } = useI18n();

	const finalInvoice = data.payment.status === 'paid';
	const invoiceNumber = t(
		finalInvoice ? 'order.receipt.invoiceNumber' : 'order.receipt.proformaInvoiceNumber',
		invoiceNumberVariables(data.order, data.payment)
	);
	const identity = data.sellerIdentity;

	const differentAddress =
		data.order.shippingAddress &&
		data.order.billingAddress &&
		textAddress(data.order.shippingAddress) !== textAddress(data.order.billingAddress);

	const currency = data.order.currencySnapshot.main.totalPrice.currency;

	const totalPriceWithoutDiscount = {
		currency,
		amount: data.order.currencySnapshot.main.discount
			? fixCurrencyRounding(
					data.order.currencySnapshot.main.totalPrice.amount +
						data.order.currencySnapshot.main.discount.amount,
					currency
			  )
			: data.order.currencySnapshot.main.totalPrice.amount
	};

	const discountPercentage = data.order.currencySnapshot.main.discount?.amount
		? data.order.currencySnapshot.main.discount.amount / totalPriceWithoutDiscount.amount
		: 0;
	const totalVatWithoutDiscount = {
		currency,
		amount: fixCurrencyRounding(
			sum(data.order.currencySnapshot.main.vat?.map((vat) => vat.amount) ?? [0]),
			currency
		)
	};
	const totalVat = {
		currency,
		amount: fixCurrencyRounding(
			totalVatWithoutDiscount.amount * (discountPercentage ? 1 - discountPercentage : 1),
			currency
		)
	};

	const totalNoTax = {
		currency,
		amount: data.order.currencySnapshot.main.totalPrice.amount - totalVat.amount
	};

	const totalWithoutDiscountNoTax = {
		amount: sumCurrency(currency, [
			...data.order.items.map(
				(item) => item.currencySnapshot.main.customPrice ?? item.currencySnapshot.main.price
			),
			data.order.currencySnapshot.main.shippingPrice ?? { amount: 0, currency }
		]),
		currency
	};

	const discountNoTax = {
		currency,
		// Alternative, but not as precise with decimal point:
		// data.order.currencySnapshot.main.discount?.amount
		// ? fixCurrencyRounding(
		// 		data.order.currencySnapshot.main.discount.amount / (1 + vatPercentage),
		// 		currency
		//   )
		// : 0
		amount: fixCurrencyRounding(totalWithoutDiscountNoTax.amount - totalNoTax.amount, currency)
	};
</script>

<div class="break-after-page w-full flex flex-col">
	<div class="flex justify-between">
		<Picture picture={data.logoPicture} class="h-16" />
		<h2 class="text-xl whitespace-pre-line text-right">
			{identity.invoice?.issuerInfo || ''}
		</h2>
	</div>

	<div class="mt-4">
		<p>{identity.businessName}</p>
		{#if identity.vatNumber}
			<p>VAT Number: {identity.vatNumber}</p>
		{/if}
		{#if identity.address.street}
			<p>{identity.address.street}</p>
		{/if}
		{#if identity.address.city || identity.address.zip || identity.address.country}
			<p>
				{#if identity.address.city || identity.address.zip}
					{identity.address.zip} {identity.address.city}{identity.address.country ? ', ' : ''}
				{/if}
				{#if identity.address.country}
					{countryName(identity.address.country)}
				{/if}
			</p>
		{/if}
	</div>

	<div class="mt-4 text-right">
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

	<div class="mt-4">
		<h2 class="text-2xl">{t('order.receipt.invoice')} n° {invoiceNumber}</h2>
		{#if data.payment.status === 'paid' && !data.payment.currencySnapshot.main.remainingToPay?.amount}
			<h2 class="text-xl font-bold text-green-500">
				{t('order.receipt.fullyPaid.message', { orderNumber: data.order.number })}
			</h2>
		{/if}
		<Trans key="order.createdAt">
			<time datetime={data.order.createdAt.toJSON()} slot="0">
				{data.order.createdAt.toLocaleDateString($locale)}
			</time>
		</Trans><br />
		{#if data.payment.createdAt}
			<Trans key="order.requestedAt">
				<time datetime={data.payment.createdAt?.toJSON()} slot="0">
					{data.payment.createdAt?.toLocaleDateString($locale)}
				</time>
			</Trans><br />
		{/if}
		{#if finalInvoice}
			<Trans key="order.paidAt">
				<time datetime={data.payment.paidAt?.toJSON()} slot="0">
					{data.payment.paidAt?.toLocaleDateString($locale)}
				</time>
			</Trans>
		{:else if data.payment.status === 'pending'}
			{t('order.receipt.proforma')}
			{#if data.payment.expiresAt}
				<Trans key="order.paymentExpiresAt">
					<time datetime={data.payment.expiresAt.toJSON()} slot="0">
						{data.payment.expiresAt.toLocaleDateString($locale)}
					</time>
				</Trans>
			{/if}
		{:else}
			<h2 class="text-xl text-red-500 font-bold">
				{t('order.receipt.cancelledOrPending')}
			</h2>
		{/if}
	</div>

	<table class="mt-4 border-collapse">
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
				{@const unitPrice = price / item.quantity}
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
						<PriceTag amount={unitPrice} currency={priceCurrency} inline />
					</td>
					<td class="text-center border border-white px-2">{item.vatRate ?? 0}%</td>
					<td class="text-center border border-white px-2">
						<PriceTag
							amount={(price * (item.vatRate ?? 0)) / 100}
							currency={priceCurrency}
							inline
						/>
					</td>
					<td class="text-right border border-white px-2">
						<PriceTag
							amount={price + (price * (item.vatRate ?? 0)) / 100}
							currency={priceCurrency}
							inline
						/>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<table class="mt-4 border-collapse">
		{#if data.order.shippingPrice && data.order.currencySnapshot.main.shippingPrice?.amount}
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
		{#if discountNoTax.amount}
			<tr style:background-color="#e7e6e6">
				<td class="border border-white px-2 text-right">{t('order.receipt.discountExcVat')}</td>
				<td class="border border-white px-2 text-right whitespace-nowrap">
					<PriceTag amount={-discountNoTax.amount} currency={discountNoTax.currency} inline />
				</td>
			</tr>
		{/if}
		<tr style:background-color="#fef2cc">
			<td class="border border-white px-2 text-right" style="width: 70%"
				>{t('order.receipt.totalExcVat')}</td
			>
			<td class="border border-white px-2 text-right whitespace-nowrap">
				<PriceTag amount={totalNoTax.amount} {currency} inline />
			</td>
		</tr>
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
		{#if data.payment.currencySnapshot.main.previouslyPaid?.amount}
			<tr style:background-color="#aeaaaa" class="text-white font-bold">
				<td class="border border-white px-2 text-right">{t('order.receipt.alreadyPaidAmount')}</td>
				<td class="border border-white px-2 whitespace-nowrap text-right">
					<PriceTag
						amount={data.payment.currencySnapshot.main.previouslyPaid.amount}
						currency={data.payment.currencySnapshot.main.previouslyPaid.currency}
						inline
					/>
				</td>
			</tr>
		{/if}
		{#if data.payment.currencySnapshot.main.price.amount !== data.order.currencySnapshot.main.totalPrice.amount}
			<tr style:background-color="#aeaaaa" class="text-white font-bold">
				<td class="border border-white px-2 text-right"
					>{finalInvoice
						? t('order.receipt.partialAmount')
						: t('order.receipt.partialAmountPre')}</td
				>
				<td class="border border-white px-2 whitespace-nowrap text-right">
					<PriceTag
						amount={data.payment.currencySnapshot.main.price.amount}
						currency={data.payment.currencySnapshot.main.price.currency}
						inline
					/>
				</td>
			</tr>
		{/if}
		{#if data.payment.currencySnapshot.main.remainingToPay?.amount}
			<tr style:background-color="#aeaaaa" class="text-white font-bold">
				<td class="border border-white px-2 text-right">{t('order.receipt.remainingAmount')}</td>
				<td class="border border-white px-2 whitespace-nowrap text-right">
					<PriceTag
						amount={data.payment.currencySnapshot.main.remainingToPay.amount}
						currency={data.payment.currencySnapshot.main.remainingToPay.currency}
						inline
					/>
				</td>
			</tr>
		{/if}
	</table>

	{#if data.order.vatFree?.reason}
		<div class="mt-4">
			{t('order.receipt.vatFreeReason', { reason: data.order.vatFree.reason })}
		</div>
	{/if}

	<div class="mt-4">
		{t('order.paidWith.' + data.payment.method, {
			paymentCurrency: data.payment.price.currency,
			mainCurrency: data.payment.currencySnapshot.accounting
				? data.payment.currencySnapshot.accounting?.price.currency
				: data.payment.currencySnapshot.main.price.currency,
			exchangeRate:
				(data.payment.currencySnapshot.accounting
					? data.payment.currencySnapshot.accounting?.price.amount
					: data.payment.currencySnapshot.main.price.amount) / data.payment.price.amount
		})}
	</div>

	<div class="mt-4">
		<Trans key="order.receipt.endMessage" params={{ businessName: identity.businessName }}>
			<br slot="0" />
			<br slot="1" />
		</Trans>
	</div>

	{#if identity.bank}
		<div class="mt-4 text-right">
			<h2 class="text-xl">{t('order.receipt.bankInfo')} :</h2>
			<table class="ml-auto">
				{#if identity.bank.accountHolder}
					<tr>
						<td class="px-2">{t('order.receipt.accountHolder')}</td>
						<td>
							{identity.bank.accountHolder}
						</td>
					</tr>
				{/if}
				{#if identity.bank.accountHolderAddress}
					<tr>
						<td class="px-2">{t('order.receipt.accountHolderAddress')}</td>
						<td>{identity.bank.accountHolderAddress}</td>
					</tr>
				{/if}
				<tr><td class="px-2">IBAN</td><td>{identity.bank.iban}</td></tr>
				<tr><td class="px-2">BIC</td><td>{identity.bank.bic}</td></tr>
			</table>
		</div>
	{/if}

	{#if data.order.receiptNote}
		<div class="mt-4 text-center">
			<p>
				<!-- eslint-disable svelte/no-at-html-tags -->
				{@html marked(data.order.receiptNote.replaceAll('<', '&lt;'))}
			</p>
		</div>
	{/if}
</div>

<style global>
	@page {
		size: portrait;
	}
	:global(html) {
		print-color-adjust: exact;
		/** 
			Margin for pdf generation. Some printers automatically add margin, some not. We add margin
			just in case, but later we should print the pdfs ourselves for standardized margins. 
		*/
		padding: 0.5cm;
		width: 21cm;
	}
</style>
