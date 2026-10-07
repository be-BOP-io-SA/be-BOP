<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';
	import { ORDER_PAYMENT_STATUSES, invoiceNumberVariables } from '$lib/types/Order.js';
	import {
		DEFAULT_CARRYING_STATUSES,
		DEFAULT_ORDER_STATUSES,
		DEFAULT_SHOWN_STATUSES
	} from '$lib/reportingStatuses';
	import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding.js';
	import { toCurrency } from '$lib/utils/toCurrency';
	import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
	import { parse } from 'devalue';
	import MultiSelect from 'svelte-multiselect';
	import type { PageData } from './$types';
	import ReportingDetailTable from './ReportingDetailTable.svelte';
	import ReportingPager from './ReportingPager.svelte';
	import { cellText, columnsToCsv, toCsv, type ReportingColumn } from './reportingColumns';

	type OrderRow = PageData['orderDetail']['rows'][number];
	type ProductRow = PageData['productDetail']['rows'][number];
	type PaymentRow = PageData['paymentDetail']['rows'][number];

	export let data;
	let tableOrderSynthesis: HTMLTableElement;
	let tableOrderSynthesisTag: HTMLTableElement;
	let tablePaymentSynthesis: HTMLTableElement;
	let tableProductSynthesis: HTMLTableElement;
	let tableDeliveryFeesSynthesis: HTMLTableElement;
	let tableVATSynthesis: HTMLTableElement;

	let filterByTag = !!data.filters.tagId;
	let selectedPaymentMethod = data.filters.paymentMethod ?? '';
	let beginsAtInput = dateTimeLocalString(data.filters.beginsAt);
	let endsAtInput = dateTimeLocalString(data.filters.endsAt);
	let html = '';
	let loadedHtml = false;
	let htmlStatus = '';
	let isLoading = false;
	let selectedEmployees = data.filters.employeesAlias.map((employee) => ({
		value: employee,
		label: employee
	}));

	// Two questions the old checkboxes answered at once, now asked apart: which orders the
	// reporting is about (search), and which of their payments it shows (display). The boxes
	// prepare the next search; the server answers the one in the address.
	let orderStatuses = new Set<string>(data.filters.orderStatuses);
	let carryingPaymentStatuses = new Set<string>(data.filters.carryingStatuses);
	let shownPaymentStatuses = new Set<string>(data.filters.shownStatuses);

	// Every table starts open; nothing is remembered between visits.
	let collapsed = new Set<string>();

	function toggle(set: Set<string>, value: string) {
		const next = new Set(set);
		if (next.has(value)) {
			next.delete(value);
		} else {
			next.add(value);
		}
		return next;
	}

	function resetStatusFilters() {
		orderStatuses = new Set<string>(DEFAULT_ORDER_STATUSES);
		carryingPaymentStatuses = new Set<string>(DEFAULT_CARRYING_STATUSES);
		shownPaymentStatuses = new Set<string>(DEFAULT_SHOWN_STATUSES);
	}

	$: statusGroups = [
		{ name: 'orderStatus', statuses: orderStatuses },
		{ name: 'carryingStatus', statuses: carryingPaymentStatuses },
		{ name: 'shownStatus', statuses: shownPaymentStatuses }
	];

	$: beginsAt = data.filters.beginsAt;
	$: endsAt = data.filters.endsAt;
	$: synthesis = data.synthesis;
	$: tagName = data.reportingTags.find((tag) => tag._id === data.filters.tagId)?.name;

	function dateTimeLocalString(date: Date) {
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
			.getDate()
			.toString()
			.padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date
			.getMinutes()
			.toString()
			.padStart(2, '0')}`;
	}

	// The server has no idea of the admin's timezone, so the bounds travel as absolute instants.
	function toIsoString(dateTimeLocal: string) {
		const date = new Date(dateTimeLocal);
		return isNaN(date.getTime()) ? '' : date.toISOString();
	}

	const { locale, textAddress, countryName, t } = useI18n();

	function formatDate(date: Date | undefined) {
		return date?.toLocaleDateString($locale) ?? '';
	}

	function formatDateTime(date: Date | undefined) {
		return date?.toLocaleString($locale);
	}

	$: orderColumns = [
		{
			header: 'Order ID',
			cell: (row) => row.number,
			href: (row) => `/admin/order/${row._id}/json`
		},
		{ header: 'Order URL', cell: (row) => data.websiteLink + '/order/' + row._id },
		{
			header: 'Order Date',
			cell: (row) => formatDate(row.createdAt),
			title: (row) => formatDateTime(row.createdAt)
		},
		{ header: 'Order Status', cell: (row) => row.status, href: (row) => `/order/${row._id}` },
		{ header: 'Currency', cell: () => data.currencies.main },
		{
			header: 'Amount',
			cell: (row) =>
				toCurrency(data.currencies.main, row.totalPrice.amount, row.totalPrice.currency)
		},
		{
			header: 'Billing Country',
			cell: (row) => countryName(row.billingAddress?.country ?? row.ipCountry ?? '')
		},
		{
			header: 'Billing Info',
			cell: (row) => (row.billingAddress ? textAddress(row.billingAddress).replace(',', '/') : '')
		},
		{
			header: 'Shipping Country',
			cell: (row) => countryName(row.shippingAddress?.country ?? row.ipCountry ?? '')
		},
		{
			header: 'Shipping Info',
			cell: (row) => (row.shippingAddress ? textAddress(row.shippingAddress).replace(',', '/') : '')
		},
		{ header: 'Cart', cell: (row) => row.productNames.join('|') }
	] satisfies ReportingColumn<OrderRow>[];

	$: productColumns = [
		{ header: 'Product URL', cell: (row) => data.websiteLink + '/product/' + row.productId },
		{ header: 'Product Name', cell: (row) => row.productName },
		{ header: 'Quantity', cell: (row) => row.quantity },
		{ header: 'Deposit', cell: (row) => row.depositPercentage ?? 100 },
		{ header: 'Order ID', cell: (row) => row.orderNumber },
		{
			header: 'Order Date',
			cell: (row) => formatDate(row.orderCreatedAt),
			title: (row) => formatDateTime(row.orderCreatedAt)
		},
		{ header: 'Currency', cell: (row) => row.currency },
		{ header: 'Price', cell: (row) => row.price },
		{ header: 'Vat Rate', cell: (row) => `${row.vatRate} %` }
	] satisfies ReportingColumn<ProductRow>[];

	$: paymentColumns = [
		{ header: 'Order ID', cell: (row) => row.orderNumber },
		{
			header: 'Invoice ID',
			cell: (row) =>
				t(
					row.status === 'paid'
						? 'order.receipt.invoiceNumber'
						: 'order.receipt.proformaInvoiceNumber',
					{
						...invoiceNumberVariables(
							{ number: row.orderNumber, createdAt: row.orderCreatedAt, payments: [] },
							row
						),
						paymentIndex: row.paymentIndex
					}
				)
		},
		{
			header: 'Payment Date',
			cell: (row) => formatDate(row.paidAt),
			title: (row) => formatDateTime(row.paidAt)
		},
		{ header: 'Order Status', cell: (row) => row.orderStatus },
		{
			header: 'Payment mean',
			cell: (row) =>
				row.method === 'point-of-sale' && row.posSubtype
					? `${row.method} (${
							data.posSubtypes.find((subtype) => subtype.slug === row.posSubtype)?.name ||
							row.posSubtype
					  })`
					: row.method
		},
		{
			header: 'Payment Status',
			cell: (row) => row.status,
			href: (row) => `/order/${row.orderId}/payment/${row.id}/receipt`
		},
		{ header: 'Payment Info', cell: (row) => row.info },
		{ header: 'Invoice', cell: (row) => row.invoice?.number ?? '' },
		{ header: 'Currency', cell: () => data.currencies.main },
		{
			header: 'Amount',
			cell: (row) => toCurrency(data.currencies.main, row.mainPrice.amount, row.mainPrice.currency)
		},
		{ header: 'Cashed Currency', cell: (row) => row.price.currency },
		{ header: 'Cashed Amount', cell: (row) => row.price.amount },
		{ header: 'Billing Country', cell: (row) => countryName(row.country ?? '') }
	] satisfies ReportingColumn<PaymentRow>[];

	function paymentSynthesisLabel(key: string) {
		const sepIdx = key.indexOf(':');
		const paymentMethod = sepIdx >= 0 ? key.slice(0, sepIdx) : key;
		const rest = sepIdx >= 0 ? key.slice(sepIdx + 1) : '';
		if (paymentMethod === 'custom' && rest) {
			return rest;
		}
		const subtype =
			paymentMethod === 'point-of-sale' && rest
				? data.posSubtypes.find((s) => s.slug === rest)
				: null;
		return subtype ? `${paymentMethod} (${subtype.name})` : paymentMethod;
	}

	async function fetchRows<Row>(table: 'orders' | 'products' | 'payments' | 'receipts') {
		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.set('table', table);
		const resp = await fetch(`${$page.url.pathname}/rows?${searchParams}`);
		if (!resp.ok) {
			throw new Error(`Error while fetching ${table} rows`);
		}
		return parse(await resp.text()) as Row[];
	}

	function downloadCSV(csvData: string, filename: string) {
		const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData);
		const link = document.createElement('a');
		link.setAttribute('href', csvContent);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}

	async function exportDetailCsv<Row>(
		table: 'orders' | 'products' | 'payments',
		columns: ReportingColumn<Row>[],
		filename: string
	) {
		try {
			downloadCSV(columnsToCsv(columns, await fetchRows<Row>(table)), filename);
		} catch (err) {
			alert(err instanceof Error ? err.message : String(err));
		}
	}

	function exportSynthesisCsv(tableElement: HTMLTableElement, filename: string) {
		if (!tableElement) {
			return;
		}
		const cellsText = (row: Element, selector: string) =>
			Array.from(row.querySelectorAll(selector)).map(cellText);
		const header = cellsText(tableElement.querySelector('thead tr') ?? tableElement, 'th');
		const rows = Array.from(tableElement.querySelectorAll('tbody tr')).map((row) =>
			cellsText(row, 'td')
		);
		downloadCSV(toCsv(header, rows), filename);
	}

	async function downloadAllOrdersJson() {
		const ids = (await fetchRows<OrderRow>('orders')).map((order) => order._id);
		if (ids.length === 0) {
			alert('No orders to export');
			return;
		}
		const resp = await fetch('/admin/orders/json', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids })
		});
		if (!resp.ok) {
			alert('Error while downloading orders JSON');
			return;
		}
		const url = URL.createObjectURL(await resp.blob());
		const link = document.createElement('a');
		link.href = url;
		link.download = 'orders.json';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	let iframePrint: HTMLIFrameElement;

	// Browsers open about 6 connections per host; more would only queue.
	const RECEIPT_FETCH_CONCURRENCY = 6;

	async function fetchReceiptHtml(receipt: { orderId: string; paymentId: string }) {
		const resp = await fetch(`/order/${receipt.orderId}/payment/${receipt.paymentId}/receipt`);
		if (!resp.ok) {
			throw new Error(`Receipt ${receipt.paymentId}: HTTP ${resp.status}`);
		}
		return await resp.text();
	}

	async function exportPdf() {
		html = '';
		loadedHtml = false;
		htmlStatus = 'Listing receipts';

		const receipts = await fetchRows<{ orderId: string; paymentId: string }>('receipts');

		if (receipts.length === 0) {
			htmlStatus = '';
			alert('No paid orders to print');
			return;
		}

		const receiptsHtml: string[] = [];
		try {
			for (let start = 0; start < receipts.length; start += RECEIPT_FETCH_CONCURRENCY) {
				htmlStatus = `Preparing invoices ${start + 1}/${receipts.length}`;
				receiptsHtml.push(
					...(await Promise.all(
						receipts.slice(start, start + RECEIPT_FETCH_CONCURRENCY).map(fetchReceiptHtml)
					))
				);
			}
		} catch {
			htmlStatus = '';
			alert('Error while fetching pdf');
			return;
		}

		// Assigned once: every srcdoc change makes the iframe re-parse the whole document.
		html = receiptsHtml.join('');

		iframePrint.addEventListener(
			'load',
			() => {
				loadedHtml = true;
				htmlStatus = '';
			},
			{
				once: true
			}
		);
	}

	afterNavigate(() => {
		isLoading = false;
		// A search has landed (or the browser came back): the boxes show what it searched.
		orderStatuses = new Set<string>(data.filters.orderStatuses);
		carryingPaymentStatuses = new Set<string>(data.filters.carryingStatuses);
		shownPaymentStatuses = new Set<string>(data.filters.shownStatuses);
	});
</script>

<h1 class="text-3xl">Reporting</h1>
<form method="GET" class="grid grid-cols-12 gap-2 col-span-12" on:submit={() => (isLoading = true)}>
	<div class="col-span-12 flex flex-col gap-4">
		<fieldset class="flex flex-col gap-1">
			<legend class="font-medium">Search — which orders this reporting is about</legend>
			<div class="flex flex-wrap gap-4">
				<span class="text-sm w-40">Order status</span>
				{#each ORDER_PAYMENT_STATUSES as status}
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							checked={orderStatuses.has(status)}
							on:change={() => (orderStatuses = toggle(orderStatuses, status))}
						/>
						{status}
					</label>
				{/each}
			</div>
			<div class="flex flex-wrap gap-4">
				<span class="text-sm w-40">Carrying a payment</span>
				{#each ORDER_PAYMENT_STATUSES as status}
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							checked={carryingPaymentStatuses.has(status)}
							on:change={() => (carryingPaymentStatuses = toggle(carryingPaymentStatuses, status))}
						/>
						{status}
					</label>
				{/each}
			</div>
			<p class="text-xs opacity-70">
				Leave every payment status ticked to keep all orders, including those with no payment yet.
				Untick to narrow: a pending order carrying a paid payment is a partially paid one.
			</p>
		</fieldset>

		<fieldset class="flex flex-col gap-1">
			<legend class="font-medium">Display — which payments the payment table shows</legend>
			<div class="flex flex-wrap gap-4">
				<span class="text-sm w-40">Payments shown</span>
				{#each ORDER_PAYMENT_STATUSES as status}
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							checked={shownPaymentStatuses.has(status)}
							on:change={() => (shownPaymentStatuses = toggle(shownPaymentStatuses, status))}
						/>
						{status}
					</label>
				{/each}
			</div>
			<p class="text-xs opacity-70">
				Totals count exactly these lines. Showing expired payments makes the total say what was
				attempted, not what was taken.
			</p>
			<button type="button" class="text-xs underline self-start" on:click={resetStatusFilters}>
				Back to default filters
			</button>
		</fieldset>

		{#each statusGroups as group}
			{#if group.statuses.size === 0}
				<input type="hidden" name={group.name} value="" />
			{/if}
			{#each [...group.statuses] as status}
				<input type="hidden" name={group.name} value={status} />
			{/each}
		{/each}
	</div>
	<div class="col-span-3">
		<label class="form-label">
			BeginsAt
			<input class="form-input" type="datetime-local" bind:value={beginsAtInput} />
			<input type="hidden" name="beginsAt" value={toIsoString(beginsAtInput)} />
		</label>
	</div>
	<div class="col-span-3">
		<label class="form-label">
			EndsAt
			<input class="form-input" type="datetime-local" bind:value={endsAtInput} />
			<input type="hidden" name="endsAt" value={toIsoString(endsAtInput)} />
		</label>
	</div>
	<div class="col-span-2">
		<label class="form-label">
			Payment Mean
			<select
				name="paymentMethod"
				class="form-input"
				disabled={data.paymentMethods.length === 0}
				bind:value={selectedPaymentMethod}
			>
				<option value=""></option>
				{#each data.paymentMethods as paymentMethod}
					<option value={paymentMethod}>
						{t('checkout.paymentMethod.' + paymentMethod)}
					</option>
				{/each}
			</select>
		</label>
	</div>
	{#if selectedPaymentMethod === 'point-of-sale' && data.posSubtypes?.length}
		<div class="col-span-2">
			<label class="form-label">
				PoS Subtype
				<select name="posSubtype" class="form-input">
					<option value="">All subtypes</option>
					{#each data.posSubtypes as subtype}
						<option value={subtype.slug} selected={data.filters.posSubtype === subtype.slug}>
							{subtype.name}
						</option>
					{/each}
				</select>
			</label>
		</div>
	{/if}
	<div class="col-span-3">
		<label class="form-label">
			Employee alias
			<MultiSelect
				--sms-options-bg="var(--body-mainPlan-backgroundColor)"
				inputClass="form-input"
				options={[
					...new Map(
						[
							...data.employees.map((employee) => ({
								value: employee.alias ?? 'System',
								label: employee.alias ?? 'System'
							})),
							{ value: 'System', label: 'System' }
						].map((option) => [option.value, option])
					).values()
				]}
				bind:selected={selectedEmployees}
			/>
			{#each selectedEmployees.map((employee) => employee.value) as employeeAlias}
				<input type="hidden" name="employeesAlias" value={employeeAlias} />
			{/each}
		</label>
	</div>
	<div class="col-span-12">
		<label class="checkbox-label">
			<input
				class="form-checkbox"
				type="checkbox"
				bind:checked={filterByTag}
				disabled={data.reportingTags.length === 0}
				on:click={() => (loadedHtml = false)}
			/>
			Filter with product tag
		</label>
		{#if data.reportingTags.length > 0}
			<label class="form-label mt-2">
				Select tag
				<select
					name="tagId"
					class="form-input"
					disabled={!filterByTag}
					value={data.filters.tagId ?? ''}
				>
					<option value="">Select a tag...</option>
					{#each data.reportingTags as tag}
						<option value={tag._id} selected={data.filters.tagId === tag._id}>
							{tag.name}
						</option>
					{/each}
				</select>
			</label>
		{:else}
			<p class="text-sm text-gray-600 mt-1">
				No tags available for filtering. Tags must be enabled as "Available as filter for reporting"
				in their settings to appear here.
			</p>
		{/if}
	</div>
	<div class="col-span-1">
		<button class="submit btn body-mainCTA mt-8" on:click={() => (loadedHtml = false)}>🔍</button>
	</div>
</form>
<div class="gap-4 grid grid-cols-12 mr-auto">
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<button
				type="button"
				class="text-2xl font-bold flex items-center gap-2"
				on:click={() => (collapsed = toggle(collapsed, 'order-detail'))}
			>
				<span class="text-base opacity-60">{collapsed.has('order-detail') ? '▶' : '▼'}</span>
				Order detail
			</button>
			<div class="flex gap-2">
				<button
					on:click={() => exportDetailCsv('orders', orderColumns, 'order-detail.csv')}
					disabled={isLoading}
					class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
					title="Export as CSV"
				>
					📊 CSV
				</button>
				{#if data.role?._id === SUPER_ADMIN_ROLE_ID}
					<button
						on:click={downloadAllOrdersJson}
						disabled={isLoading}
						class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
						title="Download all displayed orders as JSON (super-admin)"
					>
						🧾 JSON
					</button>
				{/if}
				<button
					disabled={!!htmlStatus || isLoading}
					class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
					on:click={loadedHtml ? () => iframePrint.contentWindow?.print() : exportPdf}
					title={loadedHtml ? 'Print receipts' : 'Prepare PDF receipts'}
				>
					🖨️ {loadedHtml ? 'Print' : htmlStatus || 'PDF'}
				</button>
			</div>
		</div>

		<div class:hidden={collapsed.has('order-detail')}>
			<ReportingDetailTable columns={orderColumns} rows={data.orderDetail.rows} />
			<ReportingPager
				param="ordersPage"
				current={data.orderDetail.page}
				pageCount={data.orderDetail.pageCount}
				total={data.orderDetail.total}
			/>
		</div>
	</div>
	<iframe
		srcdoc={html}
		bind:this={iframePrint}
		title=""
		style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
	/>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<div>
				<button
					type="button"
					class="text-2xl font-bold flex items-center gap-2"
					on:click={() => (collapsed = toggle(collapsed, 'product-detail'))}
				>
					<span class="text-base opacity-60">{collapsed.has('product-detail') ? '▶' : '▼'}</span>
					Product detail
				</button>
				{#if data.filters.tagId}
					<p class="text-sm text-gray-600 mt-1">
						Only showing products with the tag "{tagName ?? data.filters.tagId}".
					</p>
				{/if}
			</div>
			<button
				on:click={() => exportDetailCsv('products', productColumns, 'product-detail.csv')}
				disabled={isLoading}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
				title="Export as CSV"
			>
				📊 CSV
			</button>
		</div>
		<div class:hidden={collapsed.has('product-detail')}>
			<ReportingDetailTable columns={productColumns} rows={data.productDetail.rows} />
			<ReportingPager
				param="productsPage"
				current={data.productDetail.page}
				pageCount={data.productDetail.pageCount}
				total={data.productDetail.total}
			/>
		</div>
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<button
				type="button"
				class="text-2xl font-bold flex items-center gap-2"
				on:click={() => (collapsed = toggle(collapsed, 'payment-detail'))}
			>
				<span class="text-base opacity-60">{collapsed.has('payment-detail') ? '▶' : '▼'}</span>
				Payment Detail
			</button>
			<button
				on:click={() => exportDetailCsv('payments', paymentColumns, 'payment-detail.csv')}
				disabled={isLoading}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
				title="Export as CSV"
			>
				📊 CSV
			</button>
		</div>
		<div class:hidden={collapsed.has('payment-detail')}>
			<ReportingDetailTable columns={paymentColumns} rows={data.paymentDetail.rows} />
			<ReportingPager
				param="paymentsPage"
				current={data.paymentDetail.page}
				pageCount={data.paymentDetail.pageCount}
				total={data.paymentDetail.total}
			/>
		</div>
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<button
				type="button"
				class="text-2xl font-bold flex items-center gap-2"
				on:click={() => (collapsed = toggle(collapsed, 'order-synthesis'))}
			>
				<span class="text-base opacity-60">{collapsed.has('order-synthesis') ? '▶' : '▼'}</span>
				Order synthesis
			</button>
			<button
				on:click={() => exportSynthesisCsv(tableOrderSynthesis, 'orderSythesisExport.csv')}
				disabled={isLoading}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
				title="Export as CSV"
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class:hidden={collapsed.has('order-synthesis')}
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableOrderSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">Period</th>
						<th class="border border-gray-300 px-4 py-2">Order Quantity</th>
						<th class="border border-gray-300 px-4 py-2">order Total</th>
						<th class="border border-gray-300 px-4 py-2">Average Cart</th>
						<th class="border border-gray-300 py-2">Currency</th>
					</tr>
				</thead>
				<tbody>
					<tr class="hover:bg-gray-100 whitespace-nowrap">
						<td class="border border-gray-300 px-4 py-2">
							<time datetime={beginsAt.toISOString()} title={beginsAt.toLocaleString($locale)}>
								{beginsAt.toLocaleDateString($locale)}
							</time>
							—
							<time datetime={endsAt.toISOString()} title={endsAt.toLocaleString($locale)}>
								{endsAt.toLocaleDateString($locale)}
							</time>
						</td>
						<td class="border border-gray-300 px-4 py-2">{synthesis.orderCount}</td>
						<td class="border border-gray-300 px-4 py-2">{synthesis.orderTotal}</td>
						<td class="border border-gray-300 px-4 py-2"
							>{synthesis.orderCount
								? fixCurrencyRounding(
										synthesis.orderTotal / synthesis.orderCount,
										data.currencies.main
								  )
								: 0}</td
						>
						<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
					</tr>
				</tbody>
			</table>
		</div>

		{#if data.filters.tagId}
			<div class="flex items-start justify-between mt-4 mb-4">
				<p class="text-sm text-gray-600">
					Synthesis for tag "{tagName ?? data.filters.tagId}" only - order flat discount and
					shipping price are not included, only the specific products with the tag are included.
				</p>
				<button
					on:click={() => exportSynthesisCsv(tableOrderSynthesisTag, 'orderSythesisExport.csv')}
					disabled={isLoading}
					class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors ml-4 disabled:opacity-50"
					title="Export tag synthesis as CSV"
				>
					📊 CSV
				</button>
			</div>

			<div class="overflow-x-auto max-h-[500px]">
				<table
					class:hidden={collapsed.has('order-synthesis')}
					class="min-w-full table-auto border border-gray-300 bg-white"
					bind:this={tableOrderSynthesisTag}
				>
					<thead class="bg-gray-200">
						<tr class="whitespace-nowrap">
							<th class="border border-gray-300 px-4 py-2">Period</th>
							<th class="border border-gray-300 px-4 py-2">Order Quantity</th>
							<th class="border border-gray-300 px-4 py-2">order Total</th>
							<th class="border border-gray-300 px-4 py-2">Average Cart</th>
							<th class="border border-gray-300 py-2">Currency</th>
						</tr>
					</thead>
					<tbody>
						<tr class="hover:bg-gray-100 whitespace-nowrap">
							<td class="border border-gray-300 px-4 py-2">
								<time datetime={beginsAt.toISOString()} title={beginsAt.toLocaleString($locale)}>
									{beginsAt.toLocaleDateString($locale)}
								</time>
								—
								<time datetime={endsAt.toISOString()} title={endsAt.toLocaleString($locale)}>
									{endsAt.toLocaleDateString($locale)}
								</time>
							</td>
							<td class="border border-gray-300 px-4 py-2">{synthesis.orderCount}</td>
							<td class="border border-gray-300 px-4 py-2">{synthesis.tagOrderTotal}</td>
							<td class="border border-gray-300 px-4 py-2"
								>{synthesis.orderCount
									? fixCurrencyRounding(
											synthesis.tagOrderTotal / synthesis.orderCount,
											data.currencies.main
									  )
									: 0}</td
							>
							<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
						</tr>
					</tbody>
				</table>
			</div>
		{/if}
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<div>
				<button
					type="button"
					class="text-2xl font-bold flex items-center gap-2"
					on:click={() => (collapsed = toggle(collapsed, 'product-synthesis'))}
				>
					<span class="text-base opacity-60">{collapsed.has('product-synthesis') ? '▶' : '▼'}</span
					>
					Product synthesis
				</button>
				{#if data.filters.tagId}
					<p class="text-sm text-gray-600 mt-1">
						Only showing products with the tag "{tagName ?? data.filters.tagId}".
					</p>
				{/if}
			</div>
			<button
				on:click={() => exportSynthesisCsv(tableProductSynthesis, 'orderItemsSythesisExport.csv')}
				disabled={isLoading}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
				title="Export as CSV"
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class:hidden={collapsed.has('product-synthesis')}
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableProductSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">Period</th>
						<th class="border border-gray-300 px-4 py-2">Product ID </th>
						<th class="border border-gray-300 px-4 py-2">Product Name</th>
						<th class="border border-gray-300 px-4 py-2">Order Quantity</th>
						<th class="border border-gray-300 px-4 py-2">Currency</th>
						<th class="border border-gray-300 px-4 py-2">Total price</th>
					</tr>
				</thead>
				<tbody>
					{#each synthesis.products as product}
						<tr class="hover:bg-gray-100 whitespace-nowrap">
							<td class="border border-gray-300 px-4 py-2">
								<time datetime={beginsAt.toISOString()} title={beginsAt.toLocaleString($locale)}>
									{beginsAt.toLocaleDateString($locale)}
								</time>
								—
								<time datetime={endsAt.toISOString()} title={endsAt.toLocaleString($locale)}>
									{endsAt.toLocaleDateString($locale)}
								</time>
							</td>
							<td class="border border-gray-300 px-4 py-2">{product.productId}</td>
							<td class="border border-gray-300 px-4 py-2">{product.name}</td>
							<td class="border border-gray-300 px-4 py-2">{product.quantity}</td>
							<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
							<td class="border border-gray-300 px-4 py-2">{product.total}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<button
				type="button"
				class="text-2xl font-bold flex items-center gap-2"
				on:click={() => (collapsed = toggle(collapsed, 'payment-synthesis'))}
			>
				<span class="text-base opacity-60">{collapsed.has('payment-synthesis') ? '▶' : '▼'}</span>
				Payment synthesis
			</button>
			<button
				on:click={() => exportSynthesisCsv(tablePaymentSynthesis, 'orderPaymentSythesis.csv')}
				disabled={isLoading}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
				title="Export as CSV"
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class:hidden={collapsed.has('payment-synthesis')}
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tablePaymentSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">Period</th>
						<th class="border border-gray-300 px-4 py-2">Payment Mean </th>
						<th class="border border-gray-300 px-4 py-2">Payment Quantity</th>
						<th class="border border-gray-300 px-4 py-2">Total price</th>
						<th class="border border-gray-300 px-4 py-2">Currency</th>
						<th class="border border-gray-300 px-4 py-2">Average</th>
					</tr>
				</thead>
				<tbody>
					{#each synthesis.payments as payment}
						<tr class="hover:bg-gray-100 whitespace-nowrap">
							<td class="border border-gray-300 px-4 py-2">
								<time datetime={beginsAt.toISOString()}>
									{beginsAt.toLocaleDateString($locale)}
								</time>
								—
								<time datetime={endsAt.toISOString()}>
									{endsAt.toLocaleDateString($locale)}
								</time>
							</td>
							<td class="border border-gray-300 px-4 py-2"
								>{paymentSynthesisLabel(payment.method)}</td
							>
							<td class="border border-gray-300 px-4 py-2">{payment.quantity}</td>
							<td class="border border-gray-300 px-4 py-2">{payment.total}</td>
							<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
							<td class="border border-gray-300 px-4 py-2"
								>{fixCurrencyRounding(payment.total / payment.quantity, data.currencies.main)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<div>
				<button
					type="button"
					class="text-2xl font-bold flex items-center gap-2"
					on:click={() => (collapsed = toggle(collapsed, 'vat-synthesis'))}
				>
					<span class="text-base opacity-60">{collapsed.has('vat-synthesis') ? '▶' : '▼'}</span>
					VAT Synthesis
				</button>
				{#if data.filters.tagId}
					<p class="text-sm text-gray-600 mt-1">
						Only showing VAT for products with the tag "{tagName ?? data.filters.tagId}".
					</p>
				{/if}
			</div>
			<button
				on:click={() => exportSynthesisCsv(tableVATSynthesis, 'vat-synthesis.csv')}
				disabled={isLoading}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
				title="Export as CSV"
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class:hidden={collapsed.has('vat-synthesis')}
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableVATSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">Period</th>
						<th class="border border-gray-300 px-4 py-2">Order Quantity</th>
						<th class="border border-gray-300 px-4 py-2">VAT Total</th>
						<th class="border border-gray-300 px-4 py-2">Average VAT per order</th>
						<th class="border border-gray-300 py-2">Currency</th>
					</tr>
				</thead>
				<tbody>
					<tr class="hover:bg-gray-100 whitespace-nowrap">
						<td class="border border-gray-300 px-4 py-2">
							<time datetime={beginsAt.toISOString()} title={beginsAt.toLocaleString($locale)}>
								{beginsAt.toLocaleDateString($locale)}
							</time>
							—
							<time datetime={endsAt.toISOString()} title={endsAt.toLocaleString($locale)}>
								{endsAt.toLocaleDateString($locale)}
							</time>
						</td>
						<td class="border border-gray-300 px-4 py-2">{synthesis.orderCount}</td>
						<td class="border border-gray-300 px-4 py-2">{synthesis.vatTotal}</td>
						<td class="border border-gray-300 px-4 py-2"
							>{synthesis.orderCount
								? fixCurrencyRounding(
										synthesis.vatTotal / synthesis.orderCount,
										data.currencies.main
								  )
								: 0}</td
						>
						<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<button
				type="button"
				class="text-2xl font-bold flex items-center gap-2"
				on:click={() => (collapsed = toggle(collapsed, 'delivery-fees'))}
			>
				<span class="text-base opacity-60">{collapsed.has('delivery-fees') ? '▶' : '▼'}</span>
				Delivery Fees
			</button>
			<button
				on:click={() =>
					exportSynthesisCsv(tableDeliveryFeesSynthesis, 'deliveryFeesSynthesisExport.csv')}
				disabled={isLoading}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
				title="Export as CSV"
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class:hidden={collapsed.has('delivery-fees')}
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableDeliveryFeesSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">Period</th>
						<th class="border border-gray-300 px-4 py-2">Order Quantity</th>
						<th class="border border-gray-300 px-4 py-2">order Fees Total</th>
						<th class="border border-gray-300 px-4 py-2">Average Fees Cart</th>
						<th class="border border-gray-300 py-2">Currency</th>
					</tr>
				</thead>
				<tbody>
					<tr class="hover:bg-gray-100 whitespace-nowrap">
						<td class="border border-gray-300 px-4 py-2">
							<time datetime={beginsAt.toISOString()} title={beginsAt.toLocaleString($locale)}>
								{beginsAt.toLocaleDateString($locale)}
							</time>
							—
							<time datetime={endsAt.toISOString()} title={endsAt.toLocaleString($locale)}>
								{endsAt.toLocaleDateString($locale)}
							</time>
						</td>
						<td class="border border-gray-300 px-4 py-2">{synthesis.orderCount}</td>
						<td class="border border-gray-300 px-4 py-2">{synthesis.deliveryFeesTotal}</td>
						<td class="border border-gray-300 px-4 py-2"
							>{synthesis.orderCount
								? fixCurrencyRounding(
										synthesis.deliveryFeesTotal / synthesis.orderCount,
										data.currencies.main
								  )
								: 0}</td
						>
						<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</div>
