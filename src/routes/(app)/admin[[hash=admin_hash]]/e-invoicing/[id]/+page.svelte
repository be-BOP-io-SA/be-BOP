<script lang="ts">
	import EInvoiceDocument from '$lib/components/EInvoiceDocument.svelte';

	export let data;

	$: einvoice = data.eInvoice;
	$: lastTransmissionError = [...einvoice.statusHistory]
		.reverse()
		.find((entry) => entry.kind === 'transmission' && entry.status === 'error');

	function formatDate(date: Date) {
		return new Date(date).toLocaleString('en');
	}

	const GENERATION_BADGE: Record<string, string> = {
		pending: 'bg-yellow-100 text-yellow-800',
		generated: 'bg-green-100 text-green-800',
		failed: 'bg-red-100 text-red-800'
	};
	const TRANSMISSION_BADGE: Record<string, string> = {
		none: 'bg-gray-100 text-gray-600',
		queued: 'bg-blue-100 text-blue-800',
		submitted: 'bg-blue-100 text-blue-800',
		accepted: 'bg-green-100 text-green-800',
		rejected: 'bg-red-100 text-red-800',
		error: 'bg-red-100 text-red-800'
	};
</script>

<div class="flex justify-between items-center flex-wrap gap-4">
	<div class="flex items-center gap-3 flex-wrap">
		<h1 class="text-3xl">E-invoice n° {einvoice.invoiceNumber}</h1>
		<span
			class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold {GENERATION_BADGE[
				einvoice.generation.status
			]}"
		>
			{einvoice.generation.status}
		</span>
		<span
			class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold {TRANSMISSION_BADGE[
				einvoice.transmission.status
			]}"
		>
			{einvoice.transmission.status}
		</span>
	</div>
	<a href="{data.adminPrefix}/e-invoicing" class="btn btn-gray">Back to list</a>
</div>

<div class="flex flex-wrap gap-2">
	{#if einvoice.artifacts}
		<a href="{data.adminPrefix}/e-invoicing/{einvoice._id}/pdf" class="btn btn-black" download>
			Download PDF
		</a>
		<a href="{data.adminPrefix}/e-invoicing/{einvoice._id}/xml" class="btn btn-gray" download>
			Download XML
		</a>
	{/if}
	{#if einvoice.generation.status !== 'pending'}
		<form method="post" action="?/retry">
			<button
				type="submit"
				class="btn {einvoice.generation.status === 'failed' ? 'btn-red' : 'btn-gray'}"
			>
				{einvoice.generation.status === 'failed' ? 'Retry generation' : 'Regenerate'}
			</button>
		</form>
	{/if}
	{#if einvoice.transmission.status === 'error'}
		<form method="post" action="?/resendTransmission">
			<button type="submit" class="btn btn-red">Resend transmission</button>
		</form>
	{/if}
</div>

<div class="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 items-start">
	<EInvoiceDocument
		invoiceNumber={einvoice.invoiceNumber}
		issueDate={einvoice.issueDate}
		orderNumber={einvoice.orderNumber}
		orderCreatedAt={einvoice.orderCreatedAt}
		currency={einvoice.currency}
		seller={einvoice.seller}
		buyer={einvoice.buyer}
		lines={einvoice.lines}
		shipping={einvoice.shipping}
		discount={einvoice.discount}
		rounding={einvoice.rounding}
		vatBreakdown={einvoice.vatBreakdown ?? []}
		totals={einvoice.totals}
		paidWith={einvoice.paidWith}
	/>

	<aside class="flex flex-col gap-4">
		<div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
			<span class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Order</span>
			<a href="{data.adminPrefix}/order/{einvoice.orderId}" class="underline">
				n° {einvoice.orderNumber}
			</a>
			<span class="text-sm text-gray-600">Country: {einvoice.country} · {einvoice.format}</span>
			<span class="text-sm text-gray-600">Created: {formatDate(einvoice.createdAt)}</span>
		</div>

		{#if einvoice.generation.status === 'failed' && einvoice.generation.error}
			<div class="border border-red-200 rounded-lg p-4 bg-red-50 flex flex-col gap-2">
				<span class="text-sm font-semibold text-red-700 uppercase tracking-wide">Error</span>
				<span class="text-sm text-red-700">{einvoice.generation.error}</span>
				<span class="text-xs text-red-500">{einvoice.generation.attempts} attempts</span>
			</div>
		{/if}

		{#if einvoice.transmission.status !== 'none'}
			<div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
				<span class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Transmission</span
				>
				<span class="text-sm text-gray-600">Platform: {einvoice.transmission.platform}</span>
				{#if einvoice.transmission.externalId}
					<span class="text-sm text-gray-600 break-all">
						External id: {einvoice.transmission.externalId}
					</span>
				{/if}
				{#if einvoice.transmission.status === 'error' && lastTransmissionError?.detail}
					<span class="text-sm text-red-700 break-all">
						{lastTransmissionError.detail}
					</span>
				{/if}
			</div>
		{/if}

		{#if einvoice.artifacts}
			<div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
				<span class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Artifacts</span>
				<div class="flex flex-col gap-1">
					<a
						href="{data.adminPrefix}/e-invoicing/{einvoice._id}/pdf"
						class="underline text-sm"
						download
					>
						PDF ({(einvoice.artifacts.pdf.size / 1024).toFixed(1)} KB, {einvoice.artifacts.pdf
							.storage})
					</a>
					<span class="text-xs text-gray-500 break-all font-mono">
						{einvoice.artifacts.pdf.sha256}
					</span>
				</div>
				<div class="flex flex-col gap-1">
					<a
						href="{data.adminPrefix}/e-invoicing/{einvoice._id}/xml"
						class="underline text-sm"
						download
					>
						XML ({(einvoice.artifacts.xml.size / 1024).toFixed(1)} KB)
					</a>
					<span class="text-xs text-gray-500 break-all font-mono">
						{einvoice.artifacts.xml.sha256}
					</span>
				</div>
			</div>
		{/if}

		<div class="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
			<span class="text-sm font-semibold text-gray-700 uppercase tracking-wide">History</span>
			<table class="admin-table w-full">
				<thead class="admin-table-header">
					<tr>
						<th class="admin-table-th text-left text-xs">Date</th>
						<th class="admin-table-th text-left text-xs">Kind</th>
						<th class="admin-table-th text-left text-xs">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-300">
					{#each einvoice.statusHistory as entry}
						<tr>
							<td class="admin-table-td text-xs">{formatDate(entry.at)}</td>
							<td class="admin-table-td text-xs">{entry.kind}</td>
							<td class="admin-table-td text-xs" title={entry.detail ?? ''}>{entry.status}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</aside>
</div>
