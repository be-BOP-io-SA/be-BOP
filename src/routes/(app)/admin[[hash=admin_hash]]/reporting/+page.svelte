<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { useI18n } from '$lib/i18n.js';
	import { invoiceNumberVariables, orderItemPrice, type Price } from '$lib/types/Order.js';
	import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding.js';
	import { sum } from '$lib/utils/sum.js';
	import { sumCurrency } from '$lib/utils/sumCurrency.js';
	import { toCurrency } from '$lib/utils/toCurrency';
	import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
	import { endOfDay, startOfDay } from 'date-fns';
	import MultiSelect from 'svelte-multiselect';

	export let data;
	let tableOrder: HTMLTableElement;
	let tableProduct: HTMLTableElement;
	let tablePayment: HTMLTableElement;
	let tableOrderSynthesis: HTMLTableElement;
	let tableOrderSynthesisTag: HTMLTableElement;
	let tablePaymentSynthesis: HTMLTableElement;
	let tableProductSynthesis: HTMLTableElement;
	let tableDeliveryFeesSynthesis: HTMLTableElement;
	let tableVATSynthesis: HTMLTableElement;

	let includePending = false;
	let includeExpired = false;
	let includeCanceled = false;
	let includePartiallyPaid = false;
	let filterByTag = !!data.tagId;
	let selectedPaymentMethod = data.paymentMethod ?? '';
	let html = '';
	let loadedHtml = false;
	let htmlStatus = '';
	let isLoading = false;
	let selectedEmployees =
		data.employeesAlias?.map((employee) => ({
			value: employee,
			label: employee
		})) ?? [];

	$: beginsAt = data.beginsAtStr ? new Date(data.beginsAtStr) : startOfDay(data.beginsAt);
	$: endsAt = data.endsAtStr
		? (() => {
				const d = new Date(data.endsAtStr);
				d.setSeconds(59, 999);
				return d;
		  })()
		: endOfDay(data.endsAt);

	function dateTimeLocalString(date: Date) {
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
			.getDate()
			.toString()
			.padStart(2, '0')}T${date.getHours().toString().padStart(2, '0')}:${date
			.getMinutes()
			.toString()
			.padStart(2, '0')}`;
	}

	const { locale, textAddress, countryName, t } = useI18n();
	$: orders = data.orders.filter(
		(order) => order.createdAt >= beginsAt && order.createdAt <= endsAt
	);
	$: paidOrders = orders.filter((order) => order.status === 'paid');
	$: paymentMatchesFilter = (payment: { method: string; posSubtype?: string }) => {
		if (!data.paymentMethod) {
			return true;
		}
		if (payment.method !== data.paymentMethod) {
			return false;
		}
		if (data.posSubtype && payment.posSubtype !== data.posSubtype) {
			return false;
		}
		return true;
	};
	$: orderFiltered = orders.filter(
		(order) =>
			order.status === 'paid' ||
			(includePending && order.status === 'pending') ||
			(includeExpired && order.status === 'expired') ||
			(includeCanceled && order.status === 'canceled') ||
			(includePartiallyPaid && order.payments.find((payment) => payment.status === 'paid'))
	);
	$: orderSynthesis = {
		count: paidOrders.length,
		orderTotal: sumCurrency(
			data.currencies.main,
			paidOrders.map((order) => order.currencySnapshot.main.totalPrice)
		)
	};
	$: orderSynthesisTag = {
		count: paidOrders.length,
		orderTotal: sumCurrency(
			data.currencies.main,
			paidOrders.flatMap((order) =>
				order.items
					.filter((item) => item.product.tagIds?.includes(data.tagId ?? ''))
					.map((item) => ({
						amount: orderItemPrice(item, 'main'),
						currency: item.currencySnapshot.main.price.currency
					}))
			)
		)
	};
	$: orderDeliveryFeesSynthesis = {
		orderNumber: paidOrders.length,
		orderFeesTotal: sumCurrency(
			data.currencies.main,
			paidOrders.map(
				(order) =>
					order.currencySnapshot.main.shippingPrice ?? { amount: 0, currency: data.currencies.main }
			)
		)
	};

	$: vatSynthesis = {
		orderNumber: paidOrders.length,
		total: sumCurrency(
			data.currencies.main,
			data.tagId
				? paidOrders.flatMap(
						(order) =>
							order.items
								.filter((item) => item.product.tagIds?.includes(data.tagId ?? ''))
								.flatMap((item) => ({
									amount: (orderItemPrice(item, 'main') * item.vatRate) / 100,
									currency: item.currencySnapshot.main.price.currency
								})) ?? []
				  )
				: paidOrders.flatMap((order) => order.currencySnapshot.main.vat ?? [])
		)
	};

	function downloadCSV(csvData: string, filename: string) {
		const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvData);
		const link = document.createElement('a');
		link.setAttribute('href', csvContent);
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
	async function downloadAllOrdersJson() {
		const ids = orderFiltered.map((order) => order._id);
		if (ids.length === 0) {
			alert(t('admin.reporting.noOrdersToExport'));
			return;
		}
		const resp = await fetch('/admin/orders/json', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids })
		});
		if (!resp.ok) {
			alert(t('admin.reporting.errorDownloadingOrdersJson'));
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
	function exportcsv(tableElement: HTMLTableElement, filename: string) {
		const table = tableElement;
		if (!table) {
			return;
		}
		const rows = table.querySelectorAll('tr');
		const data = Array.from(rows).map((row) =>
			Array.from(row.querySelectorAll('td')).map((cell) => cell.innerText.trim())
		);
		const header = table.querySelectorAll('thead');
		const csvTitle = Array.from(header).map((row) =>
			Array.from(row.querySelectorAll('th')).map((cell) => cell.innerText.trim())
		);
		const csvRows = data.map((row) => row.join(',')).join('\n');
		const csvData = `${csvTitle}  ${csvRows}`;
		downloadCSV(csvData, filename);
	}

	function quantityOfProduct(orders: typeof paidOrders, tagFilter?: string) {
		const productQuantities: Record<string, { quantity: number; total: number }> = {};
		for (const order of orders) {
			for (const item of order.items) {
				// If tagFilter is specified, only include products that have that tag
				if (tagFilter && !item.product.tagIds?.includes(tagFilter)) {
					continue;
				}

				if (productQuantities[item.product._id]) {
					productQuantities[item.product._id].quantity += item.quantity;
					productQuantities[item.product._id].total += orderItemPrice(item, 'main');
				} else {
					productQuantities[item.product._id] = {
						quantity: item.quantity,
						total: orderItemPrice(item, 'main')
					};
				}
			}
		}
		return productQuantities;
	}
	function quantityOfPaymentMean(orders: typeof paidOrders) {
		const grouped = orders
			.flatMap((order) => order.payments.filter(paymentMatchesFilter))
			.reduce<Record<string, Price[]>>((acc, payment) => {
				const key =
					payment.method === 'point-of-sale' && payment.posSubtype
						? `${payment.method}:${payment.posSubtype}`
						: payment.method;
				(acc[key] ??= []).push(payment.currencySnapshot.main.price);
				return acc;
			}, {});

		return Object.fromEntries(
			Object.entries(grouped).map(([method, prices]) => [
				method,
				{ quantity: prices.length, total: sumCurrency(data.currencies.main, prices) }
			])
		);
	}
	function fetchProductById(productId: string) {
		for (const order of paidOrders) {
			for (const item of order.items) {
				if (item.product._id === productId) {
					return item.product;
				}
			}
		}
		return null;
	}

	let iframePrint: HTMLIFrameElement;

	async function exportPdf() {
		html = '';
		loadedHtml = false;
		htmlStatus = '';

		const paymentCount = sum(
			orderFiltered.map(
				(order) => order.payments.filter((payment) => payment.status === 'paid').length
			)
		);

		if (paymentCount === 0) {
			alert(t('admin.reporting.noPaidOrdersToPrint'));
			return;
		}

		let index = 0;

		for (const order of orderFiltered) {
			for (const payment of order.payments.filter((payment) => payment.status === 'paid')) {
				htmlStatus = t('admin.reporting.preparingInvoice', {
					current: index + 1,
					total: paymentCount
				});
				index++;

				const htmlResp = await fetch(`/order/${order._id}/payment/${payment.id}/receipt`);

				if (!htmlResp.ok) {
					alert(t('admin.reporting.errorFetchingPdf'));
					return;
				}
				html += await htmlResp.text();
			}
		}

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
	});
</script>

<h1 class="text-3xl">{t('admin.reporting.title')}</h1>
<div class="gap-4 grid grid-cols-3">
	<label class="col-span-3 checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={includePending}
			on:click={() => (loadedHtml = false)}
		/>
		{t('admin.reporting.includePendingOrders')}
	</label>
	<label class="col-span-3 checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={includeExpired}
			on:click={() => (loadedHtml = false)}
		/>
		{t('admin.reporting.includeExpiredOrders')}
	</label>
	<label class="col-span-3 checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={includeCanceled}
			on:click={() => (loadedHtml = false)}
		/>
		{t('admin.reporting.includeCanceledOrders')}
	</label>
	<label class="col-span-3 checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			bind:checked={includePartiallyPaid}
			on:click={() => (loadedHtml = false)}
		/>
		{t('admin.reporting.includePartiallyPaidOrders')}
	</label>
</div>
<form method="GET" class="grid grid-cols-12 gap-2 col-span-12" on:submit={() => (isLoading = true)}>
	<div class="col-span-3">
		<label class="form-label">
			{t('admin.reporting.beginsAt')}
			<input
				class="form-input"
				type="datetime-local"
				name="beginsAt"
				value={dateTimeLocalString(beginsAt)}
			/>
		</label>
	</div>
	<div class="col-span-3">
		<label class="form-label">
			{t('admin.reporting.endsAt')}
			<input
				class="form-input"
				type="datetime-local"
				name="endsAt"
				value={dateTimeLocalString(endsAt)}
			/>
		</label>
	</div>
	<div class="col-span-2">
		<label class="form-label">
			{t('admin.reporting.paymentMean')}
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
				{t('admin.reporting.posSubtype')}
				<select name="posSubtype" class="form-input">
					<option value="">{t('admin.reporting.allSubtypes')}</option>
					{#each data.posSubtypes as subtype}
						<option value={subtype.slug} selected={data.posSubtype === subtype.slug}>
							{subtype.name}
						</option>
					{/each}
				</select>
			</label>
		</div>
	{/if}
	<div class="col-span-3">
		<label class="form-label">
			{t('admin.reporting.employeeAlias')}
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
			{t('admin.reporting.filterWithProductTag')}
		</label>
		{#if data.reportingTags.length > 0}
			<label class="form-label mt-2">
				{t('admin.reporting.selectTag')}
				<select name="tagId" class="form-input" disabled={!filterByTag} value={data.tagId ?? ''}>
					<option value="">{t('admin.reporting.selectATag')}</option>
					{#each data.reportingTags as tag}
						<option value={tag._id} selected={data.tagId === tag._id}>
							{tag.name}
						</option>
					{/each}
				</select>
			</label>
		{:else}
			<p class="text-sm text-gray-600 mt-1">
				{t('admin.reporting.noTagsAvailable')}
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
			<h1 class="text-2xl font-bold">{t('admin.reporting.orderDetail')}</h1>
			<div class="flex gap-2">
				<button
					on:click={() => exportcsv(tableOrder, 'order-detail.csv')}
					class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
					title={t('admin.reporting.exportAsCsv')}
				>
					📊 CSV
				</button>
				{#if data.role?._id === SUPER_ADMIN_ROLE_ID}
					<button
						on:click={downloadAllOrdersJson}
						class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
						title={t('admin.reporting.downloadAllOrdersJson')}
					>
						🧾 JSON
					</button>
				{/if}
				<button
					disabled={!!htmlStatus || isLoading}
					class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors disabled:opacity-50"
					on:click={loadedHtml ? () => iframePrint.contentWindow?.print() : exportPdf}
					title={loadedHtml
						? t('admin.reporting.printReceipts')
						: t('admin.reporting.preparePdfReceipts')}
				>
					🖨️ {loadedHtml ? t('admin.reporting.print') : htmlStatus || 'PDF'}
				</button>
			</div>
		</div>

		<div class="overflow-x-auto max-h-[500px]">
			<table class="min-w-full table-auto border border-gray-300 bg-white" bind:this={tableOrder}>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderId')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderUrl')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderDate')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderStatus')}</th>
						<th class="border border-gray-300 py-2">{t('admin.reporting.currency')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.amount')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.billingCountry')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.billingInfo')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.shippingCountry')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.shippingInfo')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.cart')}</th>
					</tr>
				</thead>
				<tbody>
					<!-- Order rows -->
					{#each orderFiltered as order}
						<tr class="hover:bg-gray-100 whitespace-nowrap">
							<td class="border border-gray-300 px-4 py-2"
								><a
									href="/admin/order/{order._id}/json"
									target="_blank"
									class="underline body-hyperlink">{order.number}</a
								></td
							>
							<td class="border border-gray-300 px-4 py-2"
								>{data.websiteLink + '/order/' + order._id}</td
							>
							<td class="border border-gray-300 px-4 py-2">
								<time
									datetime={order.createdAt.toISOString()}
									title={order.createdAt.toLocaleString($locale)}
								>
									{order.createdAt.toLocaleDateString($locale)}
								</time>
							</td>
							<td class="border border-gray-300 px-4 py-2">
								<a href="/order/{order._id}" target="_blank" class="underline body-hyperlink">
									{order.status}
								</a>
							</td>
							<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
							<td class="border border-gray-300 px-4 py-2"
								>{toCurrency(
									data.currencies.main,
									order.currencySnapshot.main.totalPrice.amount,
									order.currencySnapshot.main.totalPrice.currency
								)}</td
							>
							<td class="border border-gray-300 px-4 py-2"
								>{countryName(order.billingAddress?.country ?? order.ipCountry ?? '')}</td
							>
							<td class="border border-gray-300 px-4 py-2"
								>{order.billingAddress
									? textAddress(order.billingAddress).replace(',', '/')
									: ''}</td
							>
							<td class="border border-gray-300 px-4 py-2"
								>{countryName(order.shippingAddress?.country ?? order.ipCountry ?? '')}</td
							>
							<td class="border border-gray-300 px-4 py-2"
								>{order.shippingAddress
									? textAddress(order.shippingAddress).replace(',', '/')
									: ''}</td
							>
							<td class="border border-gray-300 px-4 py-2">
								{order.items.map((item) => item.product.name).join('|')}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<iframe
		srcdoc={html}
		bind:this={iframePrint}
		title=""
		on:load={() => console.log('loaded')}
		style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
	/>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<div>
				<h1 class="text-2xl font-bold">{t('admin.reporting.productDetail')}</h1>
				{#if data.tagId}
					<p class="text-sm text-gray-600 mt-1">
						{t('admin.reporting.onlyShowingProductsWithTag', { tag: data.tagId })}
					</p>
				{/if}
			</div>
			<button
				on:click={() => exportcsv(tableProduct, 'product-detail.csv')}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
				title={t('admin.reporting.exportAsCsv')}
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table class="min-w-full table-auto border border-gray-300 bg-white" bind:this={tableProduct}>
				<thead class="bg-gray-200">
					<tr>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.productUrl')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.productName')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.quantity')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.deposit')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderId')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderDate')}</th>
						<th class="border border-gray-300 py-2">{t('admin.reporting.currency')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.price')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.vatRate')}</th>
					</tr>
				</thead>
				<tbody>
					<!-- Order rows -->
					{#each orderFiltered as order}
						{#each order.items as item}
							{#if !data.tagId || item.product.tagIds?.includes(data.tagId)}
								<tr class="hover:bg-gray-100 whitespace-nowrap">
									<td class="border border-gray-300 px-4 py-2"
										>{data.websiteLink + '/product/' + item.product._id}</td
									>
									<td class="border border-gray-300 px-4 py-2">{item.product.name}</td>
									<td class="border border-gray-300 px-4 py-2">{item.quantity}</td>
									<td class="border border-gray-300 px-4 py-2">{item.depositPercentage ?? 100}</td>
									<td class="border border-gray-300 px-4 py-2">{order.number}</td><td
										class="border border-gray-300 px-4 py-2"
									>
										<time
											datetime={order.createdAt.toISOString()}
											title={order.createdAt.toLocaleString($locale)}
										>
											{order.createdAt.toLocaleDateString($locale)}
										</time>
									</td>
									<td class="border border-gray-300 px-4 py-2">
										{item.currencySnapshot.main.price.currency}
									</td>
									<td class="border border-gray-300 px-4 py-2">{orderItemPrice(item, 'main')}</td>
									<td class="border border-gray-300 px-4 py-2">{item.vatRate} %</td>
								</tr>
							{/if}
						{/each}
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<h1 class="text-2xl font-bold">{t('admin.reporting.paymentDetail')}</h1>
			<button
				on:click={() => exportcsv(tablePayment, 'payment-detail.csv')}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
				title={t('admin.reporting.exportAsCsv')}
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table class="min-w-full table-auto border border-gray-300 bg-white" bind:this={tablePayment}>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderId')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.invoiceId')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.paymentDate')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderStatus')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.paymentMeanLower')}</th
						>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.paymentStatus')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.paymentInfo')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.invoice')}</th>
						<th class="border border-gray-300 py-2">{t('admin.reporting.currency')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.amount')}</th>
						<th class="border border-gray-300 py-2">{t('admin.reporting.cashedCurrency')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.cashedAmount')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.billingCountry')}</th>
					</tr>
				</thead>
				<tbody>
					<!-- Order rows -->
					{#each orders.filter((order) => order.status === 'paid' || (includePartiallyPaid && order.payments.some((payment) => payment.status === 'paid')) || (includeExpired && order.payments.some((payment) => payment.status === 'expired'))) as order}
						{#each order.payments.filter(paymentMatchesFilter) as payment}
							<tr class="hover:bg-gray-100 whitespace-nowrap">
								<td class="border border-gray-300 px-4 py-2">{order.number}</td>
								<td class="border border-gray-300 px-4 py-2"
									>{t(
										payment.status === 'paid'
											? 'order.receipt.invoiceNumber'
											: 'order.receipt.proformaInvoiceNumber',
										invoiceNumberVariables(order, payment)
									)}</td
								>

								<td class="border border-gray-300 px-4 py-2">
									{#if payment.paidAt}
										<time
											datetime={payment.paidAt.toISOString()}
											title={payment.paidAt.toLocaleString($locale)}
										>
											{payment.paidAt.toLocaleDateString($locale)}
										</time>
									{/if}
								</td>
								<td class="border border-gray-300 px-4 py-2">{order.status}</td>
								<td class="border border-gray-300 px-4 py-2"
									>{payment.method}{#if payment.method === 'point-of-sale' && payment.posSubtype}
										{@const subtype = data.posSubtypes?.find((s) => s.slug === payment.posSubtype)}
										({subtype?.name || payment.posSubtype})
									{/if}</td
								>
								<td class="border border-gray-300 px-4 py-2">
									<a
										class="body-hyperlink underline"
										target="_blank"
										href="/order/{order._id}/payment/{payment.id}/receipt">{payment.status}</a
									>
								</td>
								<td class="border border-gray-300 px-4 py-2"
									>{payment.method === 'lightning'
										? payment.invoiceId
										: payment.method === 'bank-transfer'
										? payment.bankTransferNumber
										: payment.method === 'card'
										? payment.transactions?.[0].transaction_code
										: payment.method === 'bitcoin'
										? payment.transactions?.[0].id ?? ''
										: payment.detail || ''}</td
								>
								<td class="border border-gray-300 px-4 py-2">{payment.invoice?.number ?? ''}</td>
								<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
								<td class="border border-gray-300 px-4 py-2"
									>{toCurrency(
										data.currencies.main,
										payment.currencySnapshot.main.price.amount,
										payment.currencySnapshot.main.price.currency
									)}</td
								>
								<td class="border border-gray-300 px-4 py-2">{payment.price.currency}</td>
								<td class="border border-gray-300 px-4 py-2">{payment.price.amount}</td>
								<td class="border border-gray-300 px-4 py-2"
									>{countryName(
										order.billingAddress?.country ??
											order.shippingAddress?.country ??
											order.ipCountry ??
											''
									)}</td
								>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<h1 class="text-2xl font-bold">{t('admin.reporting.orderSynthesis')}</h1>
			<button
				on:click={() => exportcsv(tableOrderSynthesis, 'orderSythesisExport.csv')}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
				title={t('admin.reporting.exportAsCsv')}
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableOrderSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.period')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderQuantity')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderTotal')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.averageCart')}</th>
						<th class="border border-gray-300 py-2">{t('admin.reporting.currency')}</th>
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
						<td class="border border-gray-300 px-4 py-2">{orderSynthesis.count}</td>
						<td class="border border-gray-300 px-4 py-2">{orderSynthesis.orderTotal}</td>
						<td class="border border-gray-300 px-4 py-2"
							>{orderSynthesis.count
								? fixCurrencyRounding(
										orderSynthesis.orderTotal / orderSynthesis.count,
										data.currencies.main
								  )
								: 0}</td
						>
						<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
					</tr>
				</tbody>
			</table>
		</div>

		{#if data.tagId}
			<div class="flex items-start justify-between mt-4 mb-4">
				<p class="text-sm text-gray-600">
					{t('admin.reporting.synthesisForTag', { tag: data.tagId })}
				</p>
				<button
					on:click={() => exportcsv(tableOrderSynthesisTag, 'orderSythesisExport.csv')}
					class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors ml-4"
					title={t('admin.reporting.exportTagSynthesisAsCsv')}
				>
					📊 CSV
				</button>
			</div>

			<div class="overflow-x-auto max-h-[500px]">
				<table
					class="min-w-full table-auto border border-gray-300 bg-white"
					bind:this={tableOrderSynthesisTag}
				>
					<thead class="bg-gray-200">
						<tr class="whitespace-nowrap">
							<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.period')}</th>
							<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderQuantity')}</th>
							<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderTotal')}</th>
							<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.averageCart')}</th>
							<th class="border border-gray-300 py-2">{t('admin.reporting.currency')}</th>
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
							<td class="border border-gray-300 px-4 py-2">{orderSynthesisTag.count}</td>
							<td class="border border-gray-300 px-4 py-2">{orderSynthesisTag.orderTotal}</td>
							<td class="border border-gray-300 px-4 py-2"
								>{orderSynthesisTag.count
									? fixCurrencyRounding(
											orderSynthesisTag.orderTotal / orderSynthesisTag.count,
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
				<h1 class="text-2xl font-bold">{t('admin.reporting.productSynthesis')}</h1>
				{#if data.tagId}
					<p class="text-sm text-gray-600 mt-1">
						{t('admin.reporting.onlyShowingProductsWithTag', { tag: data.tagId })}
					</p>
				{/if}
			</div>
			<button
				on:click={() => exportcsv(tableProductSynthesis, 'orderItemsSythesisExport.csv')}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
				title={t('admin.reporting.exportAsCsv')}
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableProductSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.period')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.productId')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.productName')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderQuantity')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.currency')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.totalPrice')}</th>
					</tr>
				</thead>
				<tbody>
					<!-- Order rows -->
					{#each Object.entries(quantityOfProduct(paidOrders, data.tagId)).sort((a, b) => b[1].quantity - a[1].quantity) as [productId, { quantity, total }]}
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
							<td class="border border-gray-300 px-4 py-2">{productId}</td>
							<td class="border border-gray-300 px-4 py-2">{fetchProductById(productId)?.name}</td>
							<td class="border border-gray-300 px-4 py-2">{quantity}</td>
							<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
							<td class="border border-gray-300 px-4 py-2">{total}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<div class="flex items-center justify-between mb-4">
			<h1 class="text-2xl font-bold">{t('admin.reporting.paymentSynthesis')}</h1>
			<button
				on:click={() => exportcsv(tablePaymentSynthesis, 'orderPaymentSythesis.csv')}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
				title={t('admin.reporting.exportAsCsv')}
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tablePaymentSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.period')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.paymentMean')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.paymentQuantity')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.totalPrice')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.currency')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.average')}</th>
					</tr>
				</thead>
				<tbody>
					<!-- Order rows -->
					{#each Object.entries(quantityOfPaymentMean(paidOrders)).sort((a, b) => b[1].quantity - a[1].quantity) as [method, { quantity, total }]}
						{@const [paymentMethod, posSubtypeSlug] = method.split(':')}
						{@const subtype = posSubtypeSlug
							? data.posSubtypes?.find((s) => s.slug === posSubtypeSlug)
							: null}
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
								>{paymentMethod}{#if subtype}
									({subtype.name}){/if}</td
							>
							<td class="border border-gray-300 px-4 py-2">{quantity}</td>
							<td class="border border-gray-300 px-4 py-2">{total}</td>
							<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
							<td class="border border-gray-300 px-4 py-2"
								>{fixCurrencyRounding(total / quantity, data.currencies.main)}</td
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
				<h1 class="text-2xl font-bold">{t('admin.reporting.vatSynthesis')}</h1>
				{#if data.tagId}
					<p class="text-sm text-gray-600 mt-1">
						{t('admin.reporting.onlyShowingVatForTag', { tag: data.tagId })}
					</p>
				{/if}
			</div>
			<button
				on:click={() => exportcsv(tableVATSynthesis, 'vat-synthesis.csv')}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
				title={t('admin.reporting.exportAsCsv')}
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableVATSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.period')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderQuantity')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.vatTotal')}</th>
						<th class="border border-gray-300 px-4 py-2"
							>{t('admin.reporting.averageVatPerOrder')}</th
						>
						<th class="border border-gray-300 py-2">{t('admin.reporting.currency')}</th>
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
						<td class="border border-gray-300 px-4 py-2">{vatSynthesis.orderNumber}</td>
						<td class="border border-gray-300 px-4 py-2"
							>{fixCurrencyRounding(vatSynthesis.total, data.currencies.main)}</td
						>
						<td class="border border-gray-300 px-4 py-2"
							>{vatSynthesis.orderNumber
								? fixCurrencyRounding(
										vatSynthesis.total / orderSynthesis.count,
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
			<h1 class="text-2xl font-bold">{t('admin.reporting.deliveryFees')}</h1>
			<button
				on:click={() => exportcsv(tableDeliveryFeesSynthesis, 'deliveryFeesSynthesisExport.csv')}
				class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
				title={t('admin.reporting.exportAsCsv')}
			>
				📊 CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableDeliveryFeesSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.period')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderQuantity')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.orderFeesTotal')}</th>
						<th class="border border-gray-300 px-4 py-2">{t('admin.reporting.averageFeesCart')}</th>
						<th class="border border-gray-300 py-2">{t('admin.reporting.currency')}</th>
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
						<td class="border border-gray-300 px-4 py-2"
							>{orderDeliveryFeesSynthesis.orderNumber}</td
						>
						<td class="border border-gray-300 px-4 py-2"
							>{orderDeliveryFeesSynthesis.orderFeesTotal}</td
						>
						<td class="border border-gray-300 px-4 py-2"
							>{orderDeliveryFeesSynthesis.orderNumber
								? fixCurrencyRounding(
										orderDeliveryFeesSynthesis.orderFeesTotal /
											orderDeliveryFeesSynthesis.orderNumber,
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
