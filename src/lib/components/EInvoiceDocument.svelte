<script lang="ts">
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { useI18n } from '$lib/i18n';
	import type { Currency } from '$lib/types/Currency';
	import type { CountryAlpha2 } from '$lib/types/Country';
	import type { EInvoiceParty, EInvoiceLine } from '$lib/types/EInvoice';
	import type { PaymentMethod } from '$lib/server/payment-methods';

	const { t, countryName } = useI18n();

	export let invoiceNumber: number;
	export let issueDate: Date | undefined;
	export let orderNumber: number;
	export let orderCreatedAt: Date | undefined;
	export let currency: Currency | undefined;
	export let seller: EInvoiceParty | undefined;
	export let buyer: EInvoiceParty | undefined;
	export let lines: EInvoiceLine[] | undefined;
	export let shipping: { amount: number; vatRate: number } | undefined;
	export let allowance: number | undefined;
	export let extraCharge: number | undefined;
	export let vatBreakdown: Array<{ rate: number; country: CountryAlpha2; amount: number }> = [];
	export let totals:
		| { exclVat: number; vat: number; inclVat: number; prepaid: number; due: number }
		| undefined;
	export let paidWith:
		| {
				method: PaymentMethod;
				posSubtype?: string;
				methodLabel?: string;
				paidAt: Date;
				display: { amount: number; currency: Currency };
				// Optional here (not in the persisted type) so the admin view degrades
				// gracefully for invoices generated before this field existed.
				fiatEquivalent?: { amount: number; currency: Currency };
				rate?: { base: Currency; quote: Currency; amount: number };
		  }
		| undefined;

	function formatDate(date: Date | undefined) {
		return date ? new Date(date).toLocaleDateString('en') : '';
	}
</script>

{#if !currency || !seller || !buyer || !totals}
	<div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
		Not generated yet — the document will appear here once the worker produces the invoice.
	</div>
{:else}
	<div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6 md:p-8 flex flex-col gap-6">
		<!-- Letterhead -->
		<div class="flex flex-wrap justify-between gap-6">
			<div class="flex flex-col gap-1">
				<span class="text-xs uppercase tracking-wide text-gray-500">Seller</span>
				<span class="font-bold text-lg">{seller.name}</span>
				{#if seller.address}
					<span class="text-sm text-gray-600">{seller.address.street}</span>
					<span class="text-sm text-gray-600">
						{seller.address.zip}
						{seller.address.city}, {countryName(seller.address.country)}
					</span>
				{/if}
				{#if seller.vatNumber}
					<span class="text-sm text-gray-600">VAT: {seller.vatNumber}</span>
				{/if}
				{#if seller.siret}
					<span class="text-sm text-gray-600">
						SIRET: {seller.siret}
						{#if seller.legalForm}· {seller.legalForm}{/if}
					</span>
				{/if}
			</div>

			<div class="flex flex-col gap-1 text-right items-end">
				<span class="text-xs uppercase tracking-wide text-gray-500">Buyer</span>
				<span class="font-bold text-lg">{buyer.name}</span>
				{#if buyer.address}
					<span class="text-sm text-gray-600">{buyer.address.street}</span>
					<span class="text-sm text-gray-600">
						{buyer.address.zip}
						{buyer.address.city}, {countryName(buyer.address.country)}
					</span>
				{/if}
				{#if buyer.vatNumber}
					<span class="text-sm text-gray-600">VAT: {buyer.vatNumber}</span>
				{/if}
				{#if buyer.siren}
					<span class="text-sm text-gray-600">SIREN: {buyer.siren}</span>
				{/if}
				{#if buyer.email}
					<span class="text-sm text-gray-600">{buyer.email}</span>
				{/if}
			</div>
		</div>

		<!-- Title -->
		<div class="flex flex-wrap justify-between items-baseline gap-2 border-t border-gray-200 pt-4">
			<h2 class="text-2xl font-bold">Invoice n° {invoiceNumber}</h2>
			<div class="text-sm text-gray-500 text-right">
				<div>Issued {formatDate(issueDate)}</div>
				<div>Order n° {orderNumber} of {formatDate(orderCreatedAt)}</div>
			</div>
		</div>

		<!-- Line items -->
		{#if lines?.length}
			<table class="admin-table w-full">
				<thead class="admin-table-header">
					<tr>
						<th class="admin-table-th text-left">Item</th>
						<th class="admin-table-th text-right">Qty</th>
						<th class="admin-table-th text-right">Unit price</th>
						<th class="admin-table-th text-right">VAT %</th>
						<th class="admin-table-th text-right">Total excl. VAT</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-300">
					{#each lines as line}
						<tr>
							<td class="admin-table-td">{line.name}</td>
							<td class="admin-table-td text-right tabular-nums">{line.quantity}</td>
							<td class="admin-table-td text-right tabular-nums">
								<PriceTag amount={line.unitPrice} {currency} inline gap="gap-1" />
							</td>
							<td class="admin-table-td text-right tabular-nums">{line.vatRate}%</td>
							<td class="admin-table-td text-right tabular-nums">
								<PriceTag amount={line.netAmount} {currency} inline gap="gap-1" />
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="text-sm text-gray-500 italic">
				Line items unavailable for this invoice — click "Regenerate" to populate them.
			</p>
		{/if}

		<!-- Totals -->
		<div class="flex justify-end">
			<table class="w-full max-w-xs">
				<tbody>
					{#if allowance}
						<tr>
							<td class="py-1 text-sm text-gray-600">Discount</td>
							<td class="py-1 text-sm text-right tabular-nums">
								<PriceTag amount={-allowance} {currency} inline gap="gap-1" />
							</td>
						</tr>
					{/if}
					{#if shipping}
						<tr>
							<td class="py-1 text-sm text-gray-600">Delivery fees</td>
							<td class="py-1 text-sm text-right tabular-nums">
								<PriceTag amount={shipping.amount} {currency} inline gap="gap-1" />
							</td>
						</tr>
					{/if}
					{#if extraCharge}
						<tr>
							<td class="py-1 text-sm text-gray-600">Rounding</td>
							<td class="py-1 text-sm text-right tabular-nums">
								<PriceTag amount={extraCharge} {currency} inline gap="gap-1" />
							</td>
						</tr>
					{/if}
					<tr>
						<td class="py-1 text-sm text-gray-600">Total excl. VAT</td>
						<td class="py-1 text-sm text-right tabular-nums">
							<PriceTag amount={totals.exclVat} {currency} inline gap="gap-1" />
						</td>
					</tr>
					{#each vatBreakdown as vat}
						<tr>
							<td class="py-1 text-sm text-gray-600">VAT {vat.rate}% ({vat.country})</td>
							<td class="py-1 text-sm text-right tabular-nums">
								<PriceTag amount={vat.amount} {currency} inline gap="gap-1" />
							</td>
						</tr>
					{/each}
					<tr class="font-bold text-base border-t border-gray-300">
						<td class="pt-2 pb-1">Total incl. VAT</td>
						<td class="pt-2 pb-1 text-right tabular-nums">
							<PriceTag amount={totals.inclVat} {currency} inline gap="gap-1" />
						</td>
					</tr>
					<tr>
						<td class="py-1 text-sm text-gray-600">Amount paid</td>
						<td class="py-1 text-sm text-right tabular-nums">
							<PriceTag amount={totals.prepaid} {currency} inline gap="gap-1" />
						</td>
					</tr>
					<tr>
						<td class="py-1 text-sm text-gray-600">Amount due</td>
						<td class="py-1 text-sm text-right tabular-nums">
							<PriceTag amount={totals.due} {currency} inline gap="gap-1" />
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Payment -->
		{#if paidWith}
			<div class="bg-gray-50 rounded-lg p-4 text-sm flex flex-col gap-1">
				<span class="text-xs uppercase tracking-wide text-gray-500">Payment</span>
				<span>
					Method: {paidWith.methodLabel ?? t('checkout.paymentMethod.' + paidWith.method)}
					· Paid on {formatDate(paidWith.paidAt)}
				</span>
				{#if paidWith.rate}
					<span>
						Paid with {paidWith.display.currency}:
						{paidWith.display.amount.toFixed(paidWith.display.currency === 'BTC' ? 8 : 2)}
						{paidWith.display.currency}
						{#if paidWith.fiatEquivalent}
							(<PriceTag
								amount={paidWith.fiatEquivalent.amount}
								currency={paidWith.fiatEquivalent.currency}
								inline
								gap="gap-1"
							/>)
						{/if}
					</span>
					<span class="text-gray-500">
						1 {paidWith.rate.base} = {paidWith.rate.amount.toFixed(2)}
						{paidWith.rate.quote} (rate at payment time)
					</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}
