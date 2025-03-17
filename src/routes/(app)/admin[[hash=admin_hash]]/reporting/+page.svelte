<script lang="ts">
	import { useI18n } from '$lib/i18n.js';
	import { invoiceNumberVariables } from '$lib/types/Order.js';
	import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding.js';
	import { sum } from '$lib/utils/sum.js';
	import { sumCurrency } from '$lib/utils/sumCurrency.js';
	import { toCurrency } from '$lib/utils/toCurrency';
	import { endOfDay, startOfDay } from 'date-fns';

	export let data;
	let tableOrder: HTMLTableElement;
	let tableProduct: HTMLTableElement;
	let tablePayment: HTMLTableElement;
	let tableOrderSynthesis: HTMLTableElement;
	let tablePaymentSynthesis: HTMLTableElement;
	let tableProductSynthesis: HTMLTableElement;
	let tableDeliveryFeesSynthesis: HTMLTableElement;
	let tableVATSynthesis: HTMLTableElement;

	let includePending = false;
	let includeExpired = false;
	let includeCanceled = false;
	let includePartiallyPaid = false;
	let html = '';
	let loadedHtml = false;
	let htmlStatus = '';

	$: beginsAt = startOfDay(data.beginsAt);
	$: endsAt = endOfDay(data.endsAt);

	function dateString(date: Date) {
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
			.getDate()
			.toString()
			.padStart(2, '0')}`;
	}

	const { locale, textAddress, countryName, t } = useI18n();
	$: orders = data.orders.filter(
		(order) => order.createdAt >= beginsAt && order.createdAt <= endsAt
	);
	$: paidOrders = orders.filter((order) => order.status === 'paid');
	$: orderFiltered = orders.filter(
		(order) =>
			order.status === 'paid' ||
			(includePending && order.status === 'pending') ||
			(includeExpired && order.status === 'expired') ||
			(includeCanceled && order.status === 'canceled') ||
			(includePartiallyPaid && order.payments.find((payment) => payment.status === 'paid'))
	);
	$: orderSynthesis = {
		orderQuantity: sum(paidOrders.map((order) => order.quantityOrder)),
		orderNumber: paidOrders.length,
		orderTotal: sum(
			paidOrders.map((order) =>
				toCurrency(
					data.currencies.main,
					order.currencySnapshot.main.totalPrice.amount,
					order.currencySnapshot.main.totalPrice.currency
				)
			)
		),
		averageCart: 0
	};
	$: orderDeliveryFeesSynthesis = {
		orderQuantity: sum(paidOrders.map((order) => order.quantityOrder)),
		orderNumber: paidOrders.length,
		orderFeesTotal: sumCurrency(
			data.currencies.main,
			paidOrders.map(
				(order) =>
					order.currencySnapshot.main.shippingPrice ?? { amount: 0, currency: data.currencies.main }
			)
		),
		averageFeesCart: 0
	};
	$: orderVATSynthesis = {
		orderQuantity: sum(paidOrders.map((order) => order.quantityOrder)),
		orderNumber: paidOrders.length,
		orderVATTotal: sum(
			paidOrders.map((order) =>
				sumCurrency(
					data.currencies.main,
					order.currencySnapshot.main.vat ?? [{ amount: 0, currency: 'SAT' }]
				)
			)
		),
		averageCart: 0
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

	function quantityOfProduct(orders: typeof paidOrders) {
		const productQuantities: Record<string, { quantity: number; total: number }> = {};
		for (const order of orders) {
			for (const item of order.items) {
				if (productQuantities[item.product._id]) {
					productQuantities[item.product._id].quantity += item.quantity;
					productQuantities[item.product._id].total += toCurrency(
						data.currencies.main,
						item.customPrice?.amount ?? item.product.price.amount,
						item.product.price.currency
					);
				} else {
					productQuantities[item.product._id] = {
						quantity: item.quantity,
						total: toCurrency(
							data.currencies.main,
							item.customPrice?.amount ?? item.product.price.amount,
							item.product.price.currency
						)
					};
				}
			}
		}
		return productQuantities;
	}
	function quantityOfPaymentMean(orders: typeof paidOrders) {
		const paymentMeanQuantities: Record<string, { quantity: number; total: number }> = {};
		for (const order of orders) {
			for (const payment of order.payments) {
				if (paymentMeanQuantities[payment.method]) {
					paymentMeanQuantities[payment.method].quantity += 1;
					paymentMeanQuantities[payment.method].total += toCurrency(
						data.currencies.main,
						payment.currencySnapshot.main.price.amount,
						payment.currencySnapshot.main.price.currency
					);
				} else {
					paymentMeanQuantities[payment.method] = {
						quantity: 1,
						total: toCurrency(
							data.currencies.main,
							payment.currencySnapshot.main.price.amount,
							payment.currencySnapshot.main.price.currency
						)
					};
				}
			}
		}
		return paymentMeanQuantities;
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
			alert('No paid orders to print');
			return;
		}

		let index = 0;

		for (const order of orderFiltered) {
			for (const payment of order.payments.filter((payment) => payment.status === 'paid')) {
				htmlStatus = `Preparing invoice ${index + 1}/${paymentCount}`;
				index++;

				const htmlResp = await fetch(`/order/${order._id}/payment/${payment.id}/receipt`);

				if (!htmlResp.ok) {
					alert('Error while fetching pdf');
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
</script>

<h1 class="text-3xl">Reporting</h1>
<div class="gap-4 grid grid-cols-3">
	<label class="col-span-3 checkbox-label">
		<input class="form-checkbox" type="checkbox" bind:checked={includePending} /> include pending orders
	</label>
	<label class="col-span-3 checkbox-label">
		<input class="form-checkbox" type="checkbox" bind:checked={includeExpired} /> include expired orders
	</label>
	<label class="col-span-3 checkbox-label">
		<input class="form-checkbox" type="checkbox" bind:checked={includeCanceled} /> include canceled orders
	</label>
	<label class="col-span-3 checkbox-label">
		<input class="form-checkbox" type="checkbox" bind:checked={includePartiallyPaid} /> include partially
		paid orders
	</label>
</div>
<form method="GET" class="grid grid-cols-12 gap-2 col-span-12">
	<div class="col-span-3">
		<label class="form-label">
			BeginsAt
			<input class="form-input" name="beginsAt" type="date" value={dateString(beginsAt)} />
		</label>
	</div>
	<div class="col-span-3">
		<label class="form-label">
			EndsAt
			<input class="form-input" type="date" name="endsAt" value={dateString(endsAt)} />
		</label>
	</div>
	<div class="col-span-4">
		<label class="form-label">
			Payment Mean
			<select name="paymentMethod" class="form-input" disabled={data.paymentMethods.length === 0}>
				<option></option>
				{#each data.paymentMethods as paymentMethod}
					<option value={paymentMethod} selected={data.paymentMethod === paymentMethod}>
						{t('checkout.paymentMethod.' + paymentMethod)}
					</option>
				{/each}
			</select>
		</label>
	</div>
	<div class="col-span-2">
		<button class="submit btn btn-gray mt-8">🔍</button>
	</div>
</form>
<div class="gap-4 grid grid-cols-12 mr-auto">
	<div class="col-span-12">
		<h1 class="text-2xl font-bold mb-4">Order detail</h1>
		<div class="flex gap-2">
			<button on:click={() => exportcsv(tableOrder, 'order-detail.csv')} class="btn btn-blue mb-2">
				Export CSV
			</button>
			<button
				disabled={!!htmlStatus}
				class="btn btn-blue mb-2"
				on:click={loadedHtml ? () => iframePrint.contentWindow?.print() : exportPdf}
			>
				{loadedHtml ? 'Print' : htmlStatus || 'Prepare PDF'}
			</button>
		</div>

		<div class="overflow-x-auto max-h-[500px]">
			<table class="min-w-full table-auto border border-gray-300 bg-white" bind:this={tableOrder}>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">Order ID</th>
						<th class="border border-gray-300 px-4 py-2">Order URL</th>
						<th class="border border-gray-300 px-4 py-2">Order Date</th>
						<th class="border border-gray-300 px-4 py-2">Order Status</th>
						<th class="border border-gray-300 py-2">Currency</th>
						<th class="border border-gray-300 px-4 py-2">Amount</th>
						<th class="border border-gray-300 px-4 py-2">Billing Country</th>
						<th class="border border-gray-300 px-4 py-2">Billing Info</th>
						<th class="border border-gray-300 px-4 py-2">Shipping Country</th>
						<th class="border border-gray-300 px-4 py-2">Shipping Info</th>
						<th class="border border-gray-300 px-4 py-2">Cart</th>
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
		<h1 class="text-2xl font-bold mb-4">Product detail</h1>
		<button
			on:click={() => exportcsv(tableProduct, 'product-detail.csv')}
			class="btn btn-blue mb-2"
		>
			Export CSV
		</button>
		<div class="overflow-x-auto max-h-[500px]">
			<table class="min-w-full table-auto border border-gray-300 bg-white" bind:this={tableProduct}>
				<thead class="bg-gray-200">
					<tr>
						<th class="border border-gray-300 px-4 py-2">Product URL</th>
						<th class="border border-gray-300 px-4 py-2">Product Name</th>
						<th class="border border-gray-300 px-4 py-2">Quantity</th>
						<th class="border border-gray-300 px-4 py-2">Deposit</th>
						<th class="border border-gray-300 px-4 py-2">Order ID</th>
						<th class="border border-gray-300 px-4 py-2">Order Date</th>
						<th class="border border-gray-300 py-2">Currency</th>
						<th class="border border-gray-300 px-4 py-2">Amount</th>
						<th class="border border-gray-300 px-4 py-2">Vat Rate</th>
					</tr>
				</thead>
				<tbody>
					<!-- Order rows -->
					{#each orderFiltered as order}
						{#each order.items as item}
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
								<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
								<td class="border border-gray-300 px-4 py-2"
									>{(toCurrency(
										data.currencies.main,
										item.customPrice?.amount ?? item.product.price.amount,
										item.customPrice?.currency ?? item.product.price.currency
									) *
										(item.product.deposit?.percentage ?? 100) *
										item.quantity) /
										100}</td
								>
								<td class="border border-gray-300 px-4 py-2">{item.vatRate}</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<h1 class="text-2xl font-bold mb-4">Payment Detail</h1>
		<div class="flex gap-2">
			<button
				on:click={() => exportcsv(tablePayment, 'payment-detail.csv')}
				class="btn btn-blue mb-2"
			>
				Export CSV
			</button>
		</div>
		<div class="overflow-x-auto max-h-[500px]">
			<table class="min-w-full table-auto border border-gray-300 bg-white" bind:this={tablePayment}>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">Order ID</th>
						<th class="border border-gray-300 px-4 py-2">Invoice ID</th>
						<th class="border border-gray-300 px-4 py-2">Payment Date</th>
						<th class="border border-gray-300 px-4 py-2">Order Status</th>
						<th class="border border-gray-300 px-4 py-2">Payment mean</th>
						<th class="border border-gray-300 px-4 py-2">Payment Status</th>
						<th class="border border-gray-300 px-4 py-2">Payment Info</th>
						<th class="border border-gray-300 px-4 py-2">Invoice</th>
						<th class="border border-gray-300 py-2">Currency</th>
						<th class="border border-gray-300 px-4 py-2">Amount</th>
						<th class="border border-gray-300 py-2">Cashed Currency</th>
						<th class="border border-gray-300 px-4 py-2">Cashed Amount</th>
						<th class="border border-gray-300 px-4 py-2">Billing Country</th>
					</tr>
				</thead>
				<tbody>
					<!-- Order rows -->
					{#each orders.filter((order) => order.status === 'paid' || (includePartiallyPaid && order.payments.some((payment) => payment.status === 'paid'))) as order}
						{#each order.payments as payment}
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
								<td class="border border-gray-300 px-4 py-2">{payment.method}</td>
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
		<h1 class="text-2xl font-bold mb-4">Order synthesis</h1>
		<button
			on:click={() => exportcsv(tableOrderSynthesis, 'orderSythesisExport.csv')}
			class="btn btn-blue mb-2"
		>
			Export CSV
		</button>
		<div class="overflow-x-auto max-h-[500px]">
			<table
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
						<td class="border border-gray-300 px-4 py-2">{orderSynthesis.orderNumber}</td>
						<td class="border border-gray-300 px-4 py-2">{orderSynthesis.orderTotal}</td>
						<td class="border border-gray-300 px-4 py-2"
							>{orderSynthesis.orderNumber
								? orderSynthesis.orderTotal / orderSynthesis.orderNumber
								: 0}</td
						>
						<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<h1 class="text-2xl font-bold mb-4">Product synthesis</h1>
		<button
			on:click={() => exportcsv(tableProductSynthesis, 'orderItemsSythesisExport.csv')}
			class="btn btn-blue mb-2"
		>
			Export CSV
		</button>
		<div class="overflow-x-auto max-h-[500px]">
			<table
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
					<!-- Order rows -->
					{#each Object.entries(quantityOfProduct(paidOrders)).sort((a, b) => b[1].quantity - a[1].quantity) as [productId, { quantity, total }]}
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
		<h1 class="text-2xl font-bold mb-4">Payment synthesis</h1>
		<button
			on:click={() => exportcsv(tablePaymentSynthesis, 'orderPaymentSythesis.csv')}
			class="btn btn-blue mb-2"
		>
			Export CSV
		</button>
		<div class="overflow-x-auto max-h-[500px]">
			<table
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
					<!-- Order rows -->
					{#each Object.entries(quantityOfPaymentMean(paidOrders)).sort((a, b) => b[1].quantity - a[1].quantity) as [method, { quantity, total }]}
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
							<td class="border border-gray-300 px-4 py-2">{method}</td>
							<td class="border border-gray-300 px-4 py-2">{quantity}</td>
							<td class="border border-gray-300 px-4 py-2">{total}</td>
							<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
							<td class="border border-gray-300 px-4 py-2">{total / quantity}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<div class="col-span-12">
		<h1 class="text-2xl font-bold mb-4">VAT Synthesis</h1>
		<button
			on:click={() => exportcsv(tableVATSynthesis, 'vat-synthesis.csv')}
			class="btn btn-blue mb-2"
		>
			Export CSV
		</button>
		<div class="overflow-x-auto max-h-[500px]">
			<table
				class="min-w-full table-auto border border-gray-300 bg-white"
				bind:this={tableVATSynthesis}
			>
				<thead class="bg-gray-200">
					<tr class="whitespace-nowrap">
						<th class="border border-gray-300 px-4 py-2">Period</th>
						<th class="border border-gray-300 px-4 py-2">Order Quantity</th>
						<th class="border border-gray-300 px-4 py-2">order VAT Total</th>
						<th class="border border-gray-300 px-4 py-2">Average VAT Cart</th>
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
						<td class="border border-gray-300 px-4 py-2">{orderVATSynthesis.orderNumber}</td>
						<td class="border border-gray-300 px-4 py-2"
							>{fixCurrencyRounding(orderVATSynthesis.orderVATTotal, data.currencies.main)}</td
						>
						<td class="border border-gray-300 px-4 py-2"
							>{orderVATSynthesis.orderNumber
								? fixCurrencyRounding(
										orderVATSynthesis.orderVATTotal / orderSynthesis.orderNumber,
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
		<h1 class="text-2xl font-bold mb-4">Delivery Fees</h1>
		<button
			on:click={() => exportcsv(tableDeliveryFeesSynthesis, 'deliveryFeesSynthesisExport.csv')}
			class="btn btn-blue mb-2"
		>
			Export CSV
		</button>
		<div class="overflow-x-auto max-h-[500px]">
			<table
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
						<td class="border border-gray-300 px-4 py-2"
							>{orderDeliveryFeesSynthesis.orderNumber}</td
						>
						<td class="border border-gray-300 px-4 py-2"
							>{orderDeliveryFeesSynthesis.orderFeesTotal}</td
						>
						<td class="border border-gray-300 px-4 py-2"
							>{orderDeliveryFeesSynthesis.orderNumber
								? orderDeliveryFeesSynthesis.orderFeesTotal / orderDeliveryFeesSynthesis.orderNumber
								: 0}</td
						>
						<td class="border border-gray-300 px-4 py-2">{data.currencies.main}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</div>
