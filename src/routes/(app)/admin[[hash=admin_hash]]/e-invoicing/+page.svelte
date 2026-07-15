<script lang="ts">
	import { page } from '$app/stores';
	import {
		E_INVOICE_GENERATION_STATUSES,
		E_INVOICE_TRANSMISSION_STATUSES
	} from '$lib/types/EInvoice';

	export let data;

	const PAGINATION_LIMIT = 50;

	$: skip = Number($page.url.searchParams.get('skip')) || 0;
</script>

<div class="flex justify-between items-center">
	<h1 class="text-3xl">E-invoices</h1>
	<a href="{data.adminPrefix}/e-invoicing/settings" class="btn btn-gray">Settings</a>
</div>

<form class="flex flex-col gap-2" method="GET">
	<div class="gap-4 flex flex-col md:flex-row md:flex-wrap">
		<label class="form-label w-[12em]">
			Invoice number
			<input
				class="form-input"
				type="number"
				name="invoiceNumber"
				value={$page.url.searchParams.get('invoiceNumber')}
			/>
		</label>
		<label class="form-label w-[12em]">
			Order number
			<input
				class="form-input"
				type="number"
				name="orderNumber"
				value={$page.url.searchParams.get('orderNumber')}
			/>
		</label>
		<label class="form-label w-[12em]">
			Generation status
			<select name="status" class="form-input">
				<option value=""></option>
				{#each E_INVOICE_GENERATION_STATUSES as status}
					<option value={status} selected={$page.url.searchParams.get('status') === status}>
						{status}
					</option>
				{/each}
			</select>
		</label>
		<label class="form-label w-[12em]">
			Transmission status
			<select name="transmissionStatus" class="form-input">
				<option value=""></option>
				{#each E_INVOICE_TRANSMISSION_STATUSES as status}
					<option
						value={status}
						selected={$page.url.searchParams.get('transmissionStatus') === status}
					>
						{status}
					</option>
				{/each}
			</select>
		</label>
	</div>
	<button type="submit" class="btn btn-black self-start">Filter</button>
</form>

<table class="w-full border border-gray-300 divide-y divide-gray-300">
	<thead class="bg-gray-200">
		<tr>
			<th class="py-2 px-2 text-left">Invoice n°</th>
			<th class="py-2 px-2 text-left">Order n°</th>
			<th class="py-2 px-2 text-left">Date</th>
			<th class="py-2 px-2 text-left">Buyer</th>
			<th class="py-2 px-2 text-right">Total</th>
			<th class="py-2 px-2 text-left">Generation</th>
			<th class="py-2 px-2 text-left">Transmission</th>
			<th class="py-2 px-2 text-left">Download</th>
		</tr>
	</thead>
	<tbody class="divide-y divide-gray-300">
		{#each data.eInvoices as einvoice}
			<tr>
				<td class="py-2 px-2">
					<a href="{data.adminPrefix}/e-invoicing/{einvoice._id}" class="underline">
						{einvoice.invoiceNumber}
					</a>
				</td>
				<td class="py-2 px-2">
					<a href="{data.adminPrefix}/order/{einvoice.orderId}" class="underline">
						{einvoice.orderNumber}
					</a>
				</td>
				<td class="py-2 px-2">{einvoice.createdAt.toLocaleDateString('en')}</td>
				<td class="py-2 px-2">{einvoice.buyerName ?? '-'}</td>
				<td class="py-2 px-2 text-right">
					{einvoice.totalInclVat !== undefined
						? `${einvoice.totalInclVat.toFixed(2)} ${einvoice.currency}`
						: '-'}
				</td>
				<td class="py-2 px-2">{einvoice.generationStatus}</td>
				<td class="py-2 px-2">{einvoice.transmissionStatus}</td>
				<td class="py-2 px-2">
					{#if einvoice.hasArtifacts}
						<a href="{data.adminPrefix}/e-invoicing/{einvoice._id}/pdf" class="underline">PDF</a>
						·
						<a href="{data.adminPrefix}/e-invoicing/{einvoice._id}/xml" class="underline">XML</a>
					{:else}
						-
					{/if}
				</td>
			</tr>
		{:else}
			<tr>
				<td class="py-2 px-2" colspan="8">No e-invoices yet.</td>
			</tr>
		{/each}
	</tbody>
</table>

<div class="flex gap-2">
	{#if skip}
		<form method="GET">
			<input type="hidden" name="skip" value={Math.max(skip - PAGINATION_LIMIT, 0)} />
			<button type="submit" class="btn btn-gray">Previous</button>
		</form>
	{/if}
	{#if data.eInvoices.length >= PAGINATION_LIMIT}
		<form method="GET">
			<input type="hidden" name="skip" value={skip + PAGINATION_LIMIT} />
			<button type="submit" class="btn btn-gray">Next</button>
		</form>
	{/if}
</div>
