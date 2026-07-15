<script lang="ts">
	export let data;

	$: einvoice = data.eInvoice;

	function formatDate(date: Date) {
		return date.toLocaleString('en');
	}
</script>

<div class="flex justify-between items-center">
	<h1 class="text-3xl">E-invoice n° {einvoice.invoiceNumber}</h1>
	<a href="{data.adminPrefix}/e-invoicing" class="btn btn-gray">Back to list</a>
</div>

<div class="flex flex-wrap gap-8">
	<div>
		<h2 class="text-2xl">Document</h2>
		<p>
			Order:
			<a href="{data.adminPrefix}/order/{einvoice.orderId}" class="underline">
				n° {einvoice.orderNumber}
			</a>
		</p>
		<p>Country: {einvoice.country} · Format: {einvoice.format}</p>
		<p>Created: {formatDate(einvoice.createdAt)}</p>
		<p>
			Generation: <span class="font-bold">{einvoice.generation.status}</span>
			{#if einvoice.generation.attempts}
				({einvoice.generation.attempts} attempts)
			{/if}
		</p>
		{#if einvoice.generation.error}
			<p class="text-red-600">Error: {einvoice.generation.error}</p>
		{/if}
		<p>
			Transmission: <span class="font-bold">{einvoice.transmission.status}</span>
			(platform: {einvoice.transmission.platform}){#if einvoice.transmission.externalId}
				· external id: {einvoice.transmission.externalId}{/if}
		</p>
		{#if einvoice.generation.status === 'failed'}
			<form method="post" action="?/retry">
				<button type="submit" class="btn btn-red mt-2">Retry generation</button>
			</form>
		{/if}
	</div>

	{#if einvoice.seller}
		<div>
			<h2 class="text-2xl">Seller</h2>
			<p>{einvoice.seller.name}</p>
			{#if einvoice.seller.vatNumber}<p>VAT: {einvoice.seller.vatNumber}</p>{/if}
			{#if einvoice.seller.siret}<p>SIRET: {einvoice.seller.siret}</p>{/if}
			{#if einvoice.seller.address}
				<p>{einvoice.seller.address.street}</p>
				<p>
					{einvoice.seller.address.zip}
					{einvoice.seller.address.city}, {einvoice.seller.address.country}
				</p>
			{/if}
		</div>
	{/if}

	{#if einvoice.buyer}
		<div>
			<h2 class="text-2xl">Buyer</h2>
			<p>{einvoice.buyer.name}</p>
			{#if einvoice.buyer.vatNumber}<p>VAT: {einvoice.buyer.vatNumber}</p>{/if}
			{#if einvoice.buyer.address}
				<p>{einvoice.buyer.address.street}</p>
				<p>
					{einvoice.buyer.address.zip}
					{einvoice.buyer.address.city}, {einvoice.buyer.address.country}
				</p>
			{/if}
			{#if einvoice.buyer.email}<p>{einvoice.buyer.email}</p>{/if}
		</div>
	{/if}
</div>

{#if einvoice.totals}
	<h2 class="text-2xl">Totals</h2>
	<table class="border border-gray-300 divide-y divide-gray-300 max-w-[30rem]">
		<tbody class="divide-y divide-gray-300">
			<tr>
				<td class="py-1 px-2">Total excl. VAT</td>
				<td class="py-1 px-2 text-right"
					>{einvoice.totals.exclVat.toFixed(2)} {einvoice.currency}</td
				>
			</tr>
			{#each einvoice.vatBreakdown ?? [] as vat}
				<tr>
					<td class="py-1 px-2">VAT {vat.rate}% ({vat.country})</td>
					<td class="py-1 px-2 text-right">{vat.amount.toFixed(2)} {einvoice.currency}</td>
				</tr>
			{/each}
			<tr class="font-bold">
				<td class="py-1 px-2">Total incl. VAT</td>
				<td class="py-1 px-2 text-right"
					>{einvoice.totals.inclVat.toFixed(2)} {einvoice.currency}</td
				>
			</tr>
			<tr>
				<td class="py-1 px-2">Amount paid</td>
				<td class="py-1 px-2 text-right"
					>{einvoice.totals.prepaid.toFixed(2)} {einvoice.currency}</td
				>
			</tr>
			<tr>
				<td class="py-1 px-2">Amount due</td>
				<td class="py-1 px-2 text-right">{einvoice.totals.due.toFixed(2)} {einvoice.currency}</td>
			</tr>
		</tbody>
	</table>
{/if}

{#if einvoice.paidWith}
	<h2 class="text-2xl">Payment</h2>
	<p>Method: {einvoice.paidWith.method} · Paid on {formatDate(einvoice.paidWith.paidAt)}</p>
	{#if einvoice.paidWith.rate}
		<p>
			Paid with {einvoice.paidWith.display.currency}:
			{einvoice.paidWith.display.amount.toFixed(
				einvoice.paidWith.display.currency === 'BTC' ? 8 : 2
			)}
			{einvoice.paidWith.display.currency} — 1 {einvoice.paidWith.rate.base} = {einvoice.paidWith.rate.amount.toFixed(
				2
			)}
			{einvoice.paidWith.rate.quote} (rate at payment time)
		</p>
	{/if}
{/if}

{#if einvoice.artifacts}
	<h2 class="text-2xl">Artifacts</h2>
	<p>
		<a href="{data.adminPrefix}/e-invoicing/{einvoice._id}/pdf" class="underline">Download PDF</a>
		({einvoice.artifacts.pdf.storage}, {(einvoice.artifacts.pdf.size / 1024).toFixed(1)} KB)
		<span class="text-sm text-gray-500 break-all">sha256: {einvoice.artifacts.pdf.sha256}</span>
	</p>
	<p>
		<a href="{data.adminPrefix}/e-invoicing/{einvoice._id}/xml" class="underline">Download XML</a>
		({(einvoice.artifacts.xml.size / 1024).toFixed(1)} KB)
		<span class="text-sm text-gray-500 break-all">sha256: {einvoice.artifacts.xml.sha256}</span>
	</p>
{/if}

<h2 class="text-2xl">History</h2>
<table class="border border-gray-300 divide-y divide-gray-300 max-w-[50rem]">
	<thead class="bg-gray-200">
		<tr>
			<th class="py-1 px-2 text-left">Date</th>
			<th class="py-1 px-2 text-left">Kind</th>
			<th class="py-1 px-2 text-left">Status</th>
			<th class="py-1 px-2 text-left">Detail</th>
		</tr>
	</thead>
	<tbody class="divide-y divide-gray-300">
		{#each einvoice.statusHistory as entry}
			<tr>
				<td class="py-1 px-2">{formatDate(entry.at)}</td>
				<td class="py-1 px-2">{entry.kind}</td>
				<td class="py-1 px-2">{entry.status}</td>
				<td class="py-1 px-2">{entry.detail ?? ''}</td>
			</tr>
		{/each}
	</tbody>
</table>
