<script lang="ts">
	import Picture from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import Trans from '$lib/components/Trans.svelte';
	import { useI18n } from '$lib/i18n.js';
	import { invoiceNumberVariables } from '$lib/types/Order.js';
	import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';
	import { sum } from '$lib/utils/sum.js';
	import { sumCurrency } from '$lib/utils/sumCurrency.js';
	import { differenceInMinutes } from 'date-fns';
	import { marked } from 'marked';
	import DEFAULT_LOGO from '$lib/assets/bebop-light.svg';
	import { computePriceForDisplay } from '$lib/types/Currency';

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

	const mainCurrencySnapshot = data.order.currencySnapshot.main;
	const currency = mainCurrencySnapshot.totalPrice.currency;

	const totalPriceWithoutDiscount = {
		currency,
		amount: mainCurrencySnapshot.discount
			? fixCurrencyRounding(
					mainCurrencySnapshot.totalPrice.amount + mainCurrencySnapshot.discount.amount,
					currency
			  )
			: mainCurrencySnapshot.totalPrice.amount
	};

	const discountFactor = mainCurrencySnapshot.discount?.amount
		? mainCurrencySnapshot.discount.amount / totalPriceWithoutDiscount.amount
		: 0;
	const totalVatWithoutDiscount = {
		currency,
		amount: fixCurrencyRounding(
			sum(mainCurrencySnapshot.vat?.map((vat) => vat.amount) ?? [0]),
			currency
		)
	};
	const totalVat = {
		currency,
		amount: fixCurrencyRounding(
			totalVatWithoutDiscount.amount * (discountFactor ? 1 - discountFactor : 1),
			currency
		)
	};

	const totalNoTax = {
		currency,
		amount: mainCurrencySnapshot.totalPrice.amount - totalVat.amount
	};

	const totalWithoutDiscountNoTax = {
		amount: sumCurrency(currency, [
			...data.order.items.map(
				(item) => item.currencySnapshot.main.customPrice ?? item.currencySnapshot.main.price
			),
			mainCurrencySnapshot.shippingPrice ?? { amount: 0, currency }
		]),
		currency
	};

	const discountNoTax = {
		currency,
		amount: mainCurrencySnapshot.discount?.amount
			? fixCurrencyRounding(totalWithoutDiscountNoTax.amount - totalNoTax.amount, currency)
			: 0
	};
</script>

<Picture picture={data.logoPicture} class="h-16" />
<h2 class="whitespace-pre-line text-left">
	{identity.invoice?.issuerInfo || ''}
</h2>
<div class="my-5">
	<br />
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
	<br />
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
	<p></p>
	<p>
		<br /><strong>{t('order.receipt.invoice')} n° {invoiceNumber}</strong><br
		/>{#if data.payment.status === 'paid' && !data.payment.currencySnapshot.main.remainingToPay?.amount}
			{t('order.receipt.fullyPaid.message', { orderNumber: data.order.number })}
		{/if}<br /><Trans key="order.createdAt">
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
			<h2 class="font-bold">
				{t('order.receipt.cancelledOrPending')}
			</h2>
		{/if}
		<br />
		<strong>{t('order.ticket.detail')} :</strong><br />
		<span style="text-decoration: underline;">N°</span>
		&nbsp; &nbsp;<span style="text-decoration: underline;">{t('order.receipt.itemName')}</span>
		&nbsp; &nbsp;<span style="text-decoration: underline;">{t('order.receipt.quantity')}</span>
		&nbsp; &nbsp;<span style="text-decoration: underline;">{t('order.receipt.unitPrice')}</span>
		&nbsp; &nbsp;<span style="text-decoration: underline;">{t('cart.vat')} (%)</span>
		&nbsp; &nbsp;<span style="text-decoration: underline;">{t('cart.vat')}</span>
		&nbsp; &nbsp;<span style="text-decoration: underline;">{t('order.receipt.totalInclVat')}</span>
		<br />
		{#each data.order.items as item, i}
			{@const basePrice =
				item.currencySnapshot.main.customPrice?.amount ?? item.currencySnapshot.main.price.amount}
			{@const priceCurrency =
				item.currencySnapshot.main.customPrice?.currency ??
				item.currencySnapshot.main.price.currency}
			{@const bookingMultiplier =
				item.booking && item.product.bookingSpec
					? differenceInMinutes(item.booking.end, item.booking.start) /
					  item.product.bookingSpec.slotMinutes
					: 1}
			{@const discountMultiplier = item.discountPercentage
				? (100 - item.discountPercentage) / 100
				: 1}
			{@const unitPrice = basePrice * bookingMultiplier * discountMultiplier}
			{@const totalPrice = unitPrice * item.quantity}
			{@const vatRate = item.vatRate ?? 0}
			{@const vatAmount = (totalPrice * vatRate) / 100}
			{@const totalWithVat = computePriceForDisplay(totalPrice + vatAmount, priceCurrency).amount}
			{i + 1} &nbsp; &nbsp;{item.chosenVariations
				? item.product.name +
				  ' - ' +
				  Object.entries(item.chosenVariations)
						.map(([key, value]) => item.product.variationLabels?.values[key][value])
						.join(' - ')
				: item.product.name} &nbsp; &nbsp;{item.quantity} &nbsp; &nbsp; <PriceTag
				amount={unitPrice}
				currency={priceCurrency}
				inline
			/>
			&nbsp; &nbsp;{vatRate}% &nbsp; &nbsp;<PriceTag
				amount={vatAmount}
				currency={priceCurrency}
				inline
			/>&nbsp; &nbsp;<PriceTag amount={totalWithVat} currency={priceCurrency} inline /><br />
		{/each}
		{#if data.order.shippingPrice && mainCurrencySnapshot.shippingPrice?.amount}
			<span style="text-decoration: underline;">{t('checkout.deliveryFees')}<br /></span>
			<PriceTag
				amount={mainCurrencySnapshot.shippingPrice.amount}
				currency={mainCurrencySnapshot.shippingPrice.currency}
				inline
			/>
			<br />
		{/if}
		{#if discountNoTax.amount}
			<span style="text-decoration: underline;">{t('order.receipt.discountExcVat')}<br /></span>
			<PriceTag amount={-discountNoTax.amount} currency={discountNoTax.currency} inline />
			<br />
		{/if}
		<span style="text-decoration: underline;">{t('order.receipt.totalExcVat')}<br /></span>
		<PriceTag amount={totalNoTax.amount} {currency} inline />
		<br />
		<span style="text-decoration: underline;">{t('order.receipt.totalVat')}<br /></span>
		<PriceTag amount={totalVat.amount} currency={totalVat.currency} inline />
		<br />
		<span style="text-decoration: underline;">{t('order.receipt.totalInclVat')}<br /></span>
		<PriceTag
			amount={mainCurrencySnapshot.totalPrice.amount}
			currency={mainCurrencySnapshot.totalPrice.currency}
			inline
		/><br />
		{#if data.payment.currencySnapshot.main.previouslyPaid?.amount}
			<span style="text-decoration: underline;">{t('order.receipt.alreadyPaidAmount')}<br /></span>
			<PriceTag
				amount={data.payment.currencySnapshot.main.previouslyPaid.amount}
				currency={data.payment.currencySnapshot.main.previouslyPaid.currency}
				inline
			/><br />
		{/if}
		{#if data.payment.currencySnapshot.main.price.amount !== mainCurrencySnapshot.totalPrice.amount}
			<span style="text-decoration: underline;"
				>{finalInvoice ? t('order.receipt.partialAmount') : t('order.receipt.partialAmountPre')}<br
				/></span
			>
			<PriceTag
				amount={data.payment.currencySnapshot.main.price.amount}
				currency={data.payment.currencySnapshot.main.price.currency}
				inline
			/><br />
		{/if}
		{#if data.payment.currencySnapshot.main.remainingToPay?.amount}
			<span style="text-decoration: underline;">{t('order.receipt.remainingAmount')}<br /></span>
			<PriceTag
				amount={data.payment.currencySnapshot.main.remainingToPay.amount}
				currency={data.payment.currencySnapshot.main.remainingToPay.currency}
				inline
			/><br />
		{/if}
	</p>
	<p>
		{t('order.paidWith.' + data.payment.method, {
			paymentCurrency: data.payment.price.currency,
			mainCurrency: data.payment.currencySnapshot.accounting
				? data.payment.currencySnapshot.accounting?.price.currency
				: data.payment.currencySnapshot.main.price.currency,
			exchangeRate:
				(data.payment.currencySnapshot.accounting
					? data.payment.currencySnapshot.accounting?.price.amount
					: data.payment.currencySnapshot.main.price.amount) / data.payment.price.amount
		})}<br /><Trans key="order.receipt.endMessage" params={{ businessName: identity.businessName }}>
			<br slot="0" />
			<br slot="1" />
		</Trans>
	</p>
	{#if identity.bank && !data.hideShopBankOnTicket}
		<p>
			<br /><span style="text-decoration: underline;">{t('order.receipt.bankInfo')}:</span><br />
			{#if identity.bank.accountHolder}
				{t('order.receipt.accountHolder')} &nbsp; &nbsp; {identity.bank.accountHolder}{/if}
			<br />{#if identity.bank.accountHolderAddress}{t('order.receipt.accountHolderAddress')} &nbsp;
				&nbsp;{identity.bank.accountHolderAddress}<br />{/if}IBAN &nbsp; &nbsp;{identity.bank
				.iban}<br />BIC &nbsp; &nbsp;{identity.bank.bic}
		</p>
	{/if}
	{#if data.order.peopleCountFromPosUi}
		<p>
			<br />{t('order.receipt.peopleCount')}: {data.order.peopleCountFromPosUi}
		</p>
	{/if}
	{#if data.order.receiptNote}
		<div class="mt-4 text-center">
			<p>
				<!-- eslint-disable svelte/no-at-html-tags -->
				{@html marked(data.order.receiptNote.replaceAll('<', '&lt;'))}
			</p>
		</div>
	{/if}
	<br />
	<p style="text-align: center;">
		{t('footer.poweredBy')}
		<img class="h-[40px] w-auto" src={DEFAULT_LOGO} alt="" />
	</p>
</div>
