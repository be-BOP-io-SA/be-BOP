<script lang="ts">
	import { computePriceInfo } from '$lib/cart';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import PosSplitTotalSection from '$lib/components/PosSplitTotalSection.svelte';
	import PosPaymentsList from '$lib/components/PosPaymentsList.svelte';
	import PosSplitItemRow from '$lib/components/PosSplitItemRow.svelte';
	import PrintableTicket from '$lib/components/PrintableTicket.svelte';
	import { useI18n } from '$lib/i18n';
	import { UNDERLYING_CURRENCY, type Currency } from '$lib/types/Currency.js';
	import { page } from '$app/stores';
	import { afterNavigate, invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { UrlDependency } from '$lib/types/UrlDependency';

	// Constants
	const DEFAULT_SHARES_COUNT = 10;
	const POS_SPLIT_SHARES_MAX_NUMS = 9;

	export let data;
	const tabSlug = data.tabSlug;
	$: tab = data.orderTab;

	// Price calculation config (DRY: используется 3 раза)
	$: priceConfig = {
		bebopCountry: data.vatCountry,
		deliveryFees: { amount: 0, currency: UNDERLYING_CURRENCY as Currency },
		freeProductUnits: {},
		userCountry: data.countryCode,
		vatExempted: data.vatExempted,
		vatNullOutsideSellerCountry: data.vatNullOutsideSellerCountry,
		vatSingleCountry: data.vatSingleCountry,
		vatProfiles: data.vatProfiles
	};

	$: tabItemsPriceInfo = computePriceInfo(tab.items, priceConfig);

	// Reset cart when tab reloads or pool is fully paid
	let splitTabQuantities = data.orderTab.items.map(() => 0);
	$: if (tab.items || isPoolFullyPaid) {
		splitTabQuantities = tab.items.map(() => 0);
	}

	$: splitTabItems = tab.items.map((item, i) => ({ ...item, quantity: splitTabQuantities[i] }));
	$: splitTabPriceInfo = computePriceInfo(splitTabItems, priceConfig);

	$: hasOriginalQuantities = tab.items.some((item) => item.originalQuantity !== undefined);

	let isPoolFullyPaid: boolean;
	$: isPoolFullyPaid =
		hasOriginalQuantities &&
		(data.sharesOrder
			? data.sharesOrder.isFullyPaid
			: tab.items.length === 0 || tab.items.every((item) => item.orderId));

	// Pool fully paid calculations (based on original quantities)
	$: itemsWithOriginalQuantities = tab.items.map((item) => ({
		...item,
		quantity: item.originalQuantity ?? item.quantity
	}));
	$: originalQuantitiesPriceInfo = computePriceInfo(itemsWithOriginalQuantities, priceConfig);

	$: poolTotals =
		isPoolFullyPaid && hasOriginalQuantities
			? computePoolTotals(tab.items, originalQuantitiesPriceInfo)
			: null;

	$: poolCurrency = tab.items[0]?.product.price.currency ?? UNDERLYING_CURRENCY;
	$: poolVatRates = [...new Set(originalQuantitiesPriceInfo.vatRates)];

	const modeParam = $page.url.searchParams.get('mode');
	let rightPannel: 'menu' | 'split-items' | 'split-shares' =
		modeParam === 'items' ? 'split-items' : modeParam === 'shares' ? 'split-shares' : 'menu';

	$: if (isPoolFullyPaid && rightPannel === 'menu') {
		rightPannel = 'split-items';
	}

	function moveOneToCart(index: number) {
		const maxQty = data.orderTab.items[index].quantity;
		const currQty = splitTabQuantities[index];
		const newQty = Math.min(currQty + 1, maxQty);
		if (newQty !== currQty) {
			splitTabQuantities[index] = newQty;
		}
	}

	function moveAllToCart(index: number) {
		const maxQty = data.orderTab.items[index].quantity;
		splitTabQuantities[index] = maxQty;
	}

	function returnOneToPool(index: number) {
		const currQty = splitTabQuantities[index];
		const newQty = Math.max(currQty - 1, 0);
		if (newQty !== currQty) {
			splitTabQuantities[index] = newQty;
		}
	}

	function returnAllToPool(index: number) {
		splitTabQuantities[index] = 0;
	}

	// Utility: Calculate item display data (price, quantity, VAT) for PosSplitItemRow
	function getItemDisplayData(
		item: (typeof tab.items)[0],
		index: number,
		priceInfo: typeof tabItemsPriceInfo,
		quantityOverride?: number
	) {
		const qty = quantityOverride ?? item.quantity;
		const pricePerItem = priceInfo.perItem[index];
		const unitPrice = item.quantity > 0 ? pricePerItem.amount / item.quantity : 0;
		const vatRate = priceInfo.vatRates[index];

		return {
			quantity: qty,
			priceInfo: { amount: unitPrice * qty, currency: pricePerItem.currency },
			vatRate
		};
	}

	function computePoolTotals(items: typeof tab.items, priceInfo: typeof tabItemsPriceInfo) {
		return items.reduce(
			(acc, item, i) => {
				const qty = item.originalQuantity ?? item.quantity;
				const pricePerItem = priceInfo.perItem[i];
				const unitPrice = item.quantity > 0 ? pricePerItem.amount / item.quantity : 0;
				const vatRate = priceInfo.vatRates[i];
				const itemExcl = unitPrice * qty;
				const itemVat = itemExcl * (vatRate / 100);

				return {
					excl: acc.excl + itemExcl,
					vat: acc.vat + itemVat,
					incl: acc.incl + itemExcl + itemVat
				};
			},
			{ excl: 0, vat: 0, incl: 0 }
		);
	}

	let sharesInput = DEFAULT_SHARES_COUNT;
	let customAmountInput = 0;
	let showCustomShares = false;
	let showCustomAmount = false;

	$: itemQuantitiesJson = JSON.stringify(
		tab.items
			.map((item, i) => [item.tabItemId, splitTabQuantities[i]])
			.filter(([, qty]) => Number(qty) > 0)
	);

	function validateItemsCheckout(event: SubmitEvent) {
		if (itemQuantitiesJson === '[]') {
			event.preventDefault();
			alert(t('pos.split.selectItems'));
		}
	}

	const { t } = useI18n();

	afterNavigate(async ({ from }) => {
		if (from?.url.pathname.includes('/order/')) {
			await invalidate(UrlDependency.orderTab(tabSlug));
		}
	});

	// Print functionality
	let printing = false;

	// Beautify tabSlug for display: "table-3" → "Table 3"
	$: poolLabel = tabSlug
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

	function handlePrintGlobalTicket() {
		printing = true;
		setTimeout(() => {
			window.print();
			printing = false;
		}, 100);
	}
</script>

<div class="flex flex-col h-screen justify-between">
	<main class="mb-auto flex-grow min-h-min overflow-y-auto">
		<div class="grid grid-cols-2 gap-4 h-full">
			<div class="touchScreen-ticket-menu flex flex-col justify-between p-3 h-full overflow-y-auto">
				{#if poolTotals}
					<div>
						<h3 class="font-semibold text-3xl">{t('pos.split.pool')}</h3>
						{#each tab.items as item, i}
							{@const displayData = getItemDisplayData(
								item,
								i,
								tabItemsPriceInfo,
								item.originalQuantity ?? item.quantity
							)}

							<PosSplitItemRow {item} {...displayData} showInternalNote={false} controls="none" />
						{/each}
					</div>
					<PosSplitTotalSection
						totalExcl={poolTotals.excl}
						totalIncl={poolTotals.incl}
						currency={poolCurrency}
						vatRates={poolVatRates}
					/>
				{:else if tab.items.length}
					<div>
						<h3 class="font-semibold text-3xl">
							{t('pos.split.tabHeader', { slug: tab.slug })}
						</h3>
						{#each tab.items as item, i}
							{@const remainingQty = item.quantity - (splitTabQuantities[i] || 0)}
							{@const displayData = getItemDisplayData(item, i, tabItemsPriceInfo, remainingQty)}
							{@const allMovedToCart = remainingQty === 0}

							<PosSplitItemRow
								{item}
								{...displayData}
								controls={rightPannel === 'split-items' && !isPoolFullyPaid
									? 'move-to-cart'
									: 'none'}
								isComplete={allMovedToCart}
								onMoveOne={() => moveOneToCart(i)}
								onMoveAll={() => moveAllToCart(i)}
							/>
						{/each}
					</div>
					<PosSplitTotalSection
						totalExcl={tabItemsPriceInfo.partialPrice}
						totalIncl={tabItemsPriceInfo.partialPriceWithVat}
						currency={tabItemsPriceInfo.currency}
						vatRates={tabItemsPriceInfo.vat.map((vat) => vat.rate)}
					/>
				{:else}
					<p>{t('cart.empty')}</p>
				{/if}
			</div>
			<div
				class="h-full {rightPannel === 'split-items'
					? 'bg-blue-50'
					: rightPannel === 'split-shares'
					? 'bg-yellow-50'
					: ''}"
			>
				{#if rightPannel === 'menu'}
					<div class="flex flex-col h-full gap-4">
						<form
							action="/pos?/checkoutTab"
							class="flex-1 flex justify-center bg-green-800 hover:bg-green-900"
							method="POST"
						>
							<input type="hidden" name="tabSlug" value={tabSlug} />
							<button class="text-white font-bold py-2 px-4 text-6xl" type="submit">
								{t('pos.split.cashIn')}<br />({t('pos.split.all')})
							</button>
						</form>
						<button
							class="flex-1 bg-yellow-800 hover:bg-yellow-900 text-white font-bold py-2 px-4 text-6xl"
							on:click={() => (rightPannel = 'split-shares')}
						>
							{t('pos.split.split')}<br />({t('pos.split.shares')})
						</button>
						<button
							class="flex-1 py-2 px-4 text-6xl text-white font-bold disabled:bg-gray-400 disabled:cursor-not-allowed {data.sharesOrder &&
							!data.sharesOrder.isFullyPaid
								? 'bg-gray-400'
								: 'bg-blue-800 hover:bg-blue-900'}"
							on:click={() => (rightPannel = 'split-items')}
							disabled={data.sharesOrder && !data.sharesOrder.isFullyPaid}
						>
							{t('pos.split.split')}<br />({t('pos.split.itemize')})
							{#if data.sharesOrder && !data.sharesOrder.isFullyPaid}
								<div class="text-sm mt-2 text-gray-200">
									⚠️ {t('pos.split.completeSharesFirst') || 'Complete payment via Split by shares'}
								</div>
							{/if}
						</button>
					</div>
				{:else if rightPannel === 'split-items'}
					<div
						class="touchScreen-ticket-menu flex flex-col justify-between p-3 h-full overflow-y-auto"
					>
						<div>
							<h3 class="font-semibold text-3xl">
								{isPoolFullyPaid
									? t('pos.split.poolRemainingToPay')
									: t('pos.split.tabToPayNow', { slug: tab.slug })}
							</h3>
							{#each splitTabItems as item, i}
								{@const qtyInCart = splitTabQuantities[i] || 0}
								{#if isPoolFullyPaid || qtyInCart > 0}
									{@const displayData = getItemDisplayData(
										item,
										i,
										splitTabPriceInfo,
										isPoolFullyPaid ? 0 : qtyInCart
									)}

									<PosSplitItemRow
										{item}
										{...displayData}
										controls={isPoolFullyPaid ? 'none' : 'return-to-pool'}
										isComplete={isPoolFullyPaid}
										onReturnOne={() => returnOneToPool(i)}
										onReturnAll={() => returnAllToPool(i)}
									/>
								{/if}
							{/each}
						</div>
						<PosSplitTotalSection
							totalExcl={splitTabPriceInfo.partialPrice}
							totalIncl={splitTabPriceInfo.partialPriceWithVat}
							currency={splitTabPriceInfo.currency}
							vatRates={splitTabPriceInfo.vat.map((vat) => vat.rate)}
						/>
					</div>
				{:else if rightPannel === 'split-shares'}
					<div class="flex flex-col h-full gap-4 p-4">
						{#if data.sharesOrder}
							{#if data.sharesOrder.payments && data.sharesOrder.payments.length > 0}
								{@const itemsPayments = data.sharesOrder.payments.filter(
									(p) => p.splitMode === 'items'
								)}
								{@const sharesPayments = data.sharesOrder.payments.filter(
									(p) => p.splitMode === 'shares'
								)}

								<PosPaymentsList
									payments={itemsPayments}
									title="Split by items"
									bgClass="bg-white border-2 border-blue-300"
								/>

								<PosPaymentsList
									payments={sharesPayments}
									title="Split by shares"
									bgClass="bg-gray-100"
								/>
							{/if}

							<div class="bg-gray-100 p-6 rounded-lg space-y-3">
								<div class="text-3xl font-semibold">{t('pos.split.totalAlreadyPaid')}</div>
								<div class="text-4xl font-bold">
									<PriceTag
										amount={data.sharesOrder.totalAlreadyPaid}
										currency={data.sharesOrder.currency}
										main
									/>
								</div>

								<div class="border-t-2 border-gray-300 my-3"></div>

								{#if data.sharesOrder.isFullyPaid}
									<div class="text-4xl font-bold text-green-600">{t('pos.split.allPaid')} ✅</div>
								{:else}
									<div class="text-3xl font-semibold">{t('pos.split.remainingToPay')}</div>
									<div class="text-4xl font-bold text-red-600">
										<PriceTag
											amount={data.sharesOrder.remainingToPay}
											currency={data.sharesOrder.currency}
											main
										/>
									</div>
								{/if}
							</div>
						{/if}

						{#if !data.sharesOrder?.isFullyPaid}
							<div class="grid grid-cols-3 gap-3">
								{#each Array.from({ length: POS_SPLIT_SHARES_MAX_NUMS }, (_, i) => i + 1) as num}
									<form method="POST" action="?/checkoutTabPartial" use:enhance>
										<input type="hidden" name="mode" value="equal" />
										<input type="hidden" name="shares" value={num} />
										<button
											type="submit"
											class="bg-yellow-800 hover:bg-yellow-900 text-white font-bold text-4xl p-4 rounded w-full"
											disabled={data.sharesOrder?.isFullyPaid}
										>
											{num}
										</button>
									</form>
								{/each}
							</div>

							<form method="POST" action="?/checkoutTabPartial" use:enhance>
								<input type="hidden" name="mode" value="custom-amount" />
								<input
									type="hidden"
									name="customAmount"
									value={data.sharesOrder
										? data.sharesOrder.remainingToPay
										: tabItemsPriceInfo.partialPriceWithVat}
								/>
								<button
									type="submit"
									class="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-4 text-3xl rounded"
									disabled={data.sharesOrder?.isFullyPaid}
								>
									{t('pos.split.payRemaining') || 'Pay Remaining'}
								</button>
							</form>

							<button
								class="w-full bg-yellow-800 hover:bg-yellow-900 text-white font-bold py-4 text-3xl rounded"
								on:click={() => (showCustomShares = !showCustomShares)}
								disabled={data.sharesOrder?.isFullyPaid}
							>
								{t('pos.split.enterNumberOfParts')}
							</button>

							{#if showCustomShares}
								<div class="flex gap-2">
									<input
										type="number"
										bind:value={sharesInput}
										min="2"
										class="flex-1 text-3xl p-2 border rounded"
									/>
									<form
										method="POST"
										action="?/checkoutTabPartial"
										use:enhance
										on:submit={() => (showCustomShares = false)}
									>
										<input type="hidden" name="mode" value="equal" />
										<input type="hidden" name="shares" bind:value={sharesInput} />
										<button
											type="submit"
											class="bg-green-800 hover:bg-green-900 text-white px-8 text-3xl rounded"
										>
											{t('pos.split.ok')}
										</button>
									</form>
								</div>
							{/if}

							<button
								class="w-full bg-yellow-800 hover:bg-yellow-900 text-white font-bold py-4 text-3xl rounded"
								on:click={() => (showCustomAmount = !showCustomAmount)}
								disabled={data.sharesOrder?.isFullyPaid}
							>
								{t('pos.split.manualAmount')}
							</button>

							{#if showCustomAmount}
								<div class="flex gap-2">
									<input
										type="number"
										bind:value={customAmountInput}
										min="0"
										max={tabItemsPriceInfo.partialPriceWithVat}
										step="0.01"
										class="flex-1 text-3xl p-2 border rounded"
									/>
									<form
										method="POST"
										action="?/checkoutTabPartial"
										use:enhance
										on:submit={() => (showCustomAmount = false)}
									>
										<input type="hidden" name="mode" value="custom-amount" />
										<input type="hidden" name="customAmount" bind:value={customAmountInput} />
										<button
											type="submit"
											class="bg-green-800 hover:bg-green-900 text-white px-8 text-3xl rounded"
										>
											{t('pos.split.ok')}
										</button>
									</form>
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</main>
	<footer class="shrink-0">
		<div class="grid grid-cols-2 gap-4 mt-2">
			{#if isPoolFullyPaid}
				<button
					class="bg-blue-800 hover:bg-blue-900 uppercase text-3xl text-white p-4 text-center"
					on:click={handlePrintGlobalTicket}
				>
					{t('pos.split.globalTicket')}
				</button>
				<form method="POST" action="?/closePool" use:enhance>
					<button
						type="submit"
						class="bg-green-800 hover:bg-green-900 uppercase text-3xl text-white p-4 text-center w-full"
					>
						{t('pos.split.closePool')}
					</button>
				</form>
			{:else if rightPannel === 'menu'}
				<a
					class="touchScreen-action-cancel uppercase text-3xl text-white p-4 text-center"
					href="/pos/touch/tab/{tabSlug}"
				>
					{t('pos.split.return')}
				</a>
			{:else}
				<button
					class="touchScreen-action-cancel uppercase text-3xl text-white p-4 text-center"
					on:click={() => (rightPannel = 'menu')}
				>
					{t('pos.split.return')}
				</button>
			{/if}
			{#if rightPannel === 'split-items' && !isPoolFullyPaid}
				<form
					method="POST"
					action="?/checkoutTabPartial"
					use:enhance
					on:submit={validateItemsCheckout}
				>
					<input type="hidden" name="itemQuantities" value={itemQuantitiesJson} />
					<button
						type="submit"
						class="uppercase text-3xl p-4 text-center w-full {splitTabPriceInfo.partialPriceWithVat >
						0
							? 'touchScreen-action-cta'
							: 'bg-gray-400 text-white cursor-not-allowed'}"
						disabled={splitTabPriceInfo.partialPriceWithVat === 0}
					>
						{t('pos.split.paySelected')}
					</button>
				</form>
			{/if}
		</div>
	</footer>
</div>

{#if printing && poolTotals}
	<PrintableTicket
		{poolLabel}
		generatedAt={new Date()}
		tagGroups={[
			{
				tagNames: [],
				items: tab.items.map((item) => ({
					product: { name: item.product.name },
					quantity: item.originalQuantity ?? item.quantity,
					variations: [],
					notes: []
				}))
			}
		]}
		priceInfo={{
			itemPrices: originalQuantitiesPriceInfo.perItem,
			total: poolTotals.incl,
			vatRate: poolVatRates[0] ?? 0,
			currency: poolCurrency
		}}
	/>
{/if}
