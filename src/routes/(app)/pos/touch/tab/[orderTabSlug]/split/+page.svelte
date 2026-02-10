<script lang="ts">
	import { computePriceInfo } from '$lib/cart';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import PosSplitTotalSection from '$lib/components/PosSplitTotalSection.svelte';
	import PosPaymentsList from '$lib/components/PosPaymentsList.svelte';
	import PosSplitItemRow from '$lib/components/PosSplitItemRow.svelte';
	import { useI18n } from '$lib/i18n';
	import { UNDERLYING_CURRENCY, type Currency } from '$lib/types/Currency.js';
	import { toCurrency } from '$lib/utils/toCurrency';
	import { PAYMENT_METHOD_EMOJI } from '$lib/types/Order';
	import type { PaymentMethod } from '$lib/server/payment-methods';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { swipe } from '$lib/utils/swipe';
	import PosPaymentMethodSelector, {
		type PaymentOption
	} from '$lib/components/PosPaymentMethodSelector.svelte';

	const { t } = useI18n();

	// Constants
	const DEFAULT_SHARES_COUNT = 10;
	const POS_SPLIT_SHARES_MAX_NUMS = 9;

	export let data;
	const tabSlug = data.tabSlug;
	$: tab = data.orderTab;

	// Payment method selector
	type PaymentSubtype = { slug: string; name: string; parentMethod: PaymentMethod };

	function buildPaymentOptions(
		methods: PaymentMethod[],
		subtypes: PaymentSubtype[],
		showFreeOnly: boolean
	): PaymentOption[] {
		if (showFreeOnly) {
			return [
				{
					method: 'free',
					subtype: null,
					label: t('checkout.paymentMethod.free'),
					icon: PAYMENT_METHOD_EMOJI.free
				}
			];
		}

		const subtypesByParent = subtypes.reduce((map, subtype) => {
			if (!map.has(subtype.parentMethod)) {
				map.set(subtype.parentMethod, []);
			}
			const existing = map.get(subtype.parentMethod);
			if (existing) {
				existing.push(subtype);
			}
			return map;
		}, new Map<PaymentMethod, PaymentSubtype[]>());

		return methods
			.filter((method) => method !== 'free')
			.flatMap((method): PaymentOption[] => {
				const methodSubtypes = subtypesByParent.get(method);
				if (methodSubtypes?.length) {
					return methodSubtypes.map((subtype) => ({
						method: subtype.parentMethod,
						subtype: subtype.slug,
						label: subtype.name,
						icon: PAYMENT_METHOD_EMOJI[subtype.parentMethod]
					}));
				}
				return [
					{
						method,
						subtype: null,
						label: t(`checkout.paymentMethod.${method}`),
						icon: PAYMENT_METHOD_EMOJI[method]
					}
				];
			});
	}

	// Show 'free' only when:
	// - Items mode: items ARE selected AND their total is 0 (free items)
	// - Shares mode: entire tab total is 0 (all items are free) OR 100% discount applied
	$: hasSelectedItems = splitTabQuantities.some((qty) => qty > 0);
	$: showFreeOnlyForItems = hasSelectedItems && splitTabPriceInfo.partialPriceWithVat === 0;
	// Check if every item has 100% discount (tag-aware: only matching items get discountPercentage)
	$: isFullPoolDiscount = tab.items.every((item) => item.discountPercentage === 100);
	$: showFreeOnlyForShares = tabItemsPriceInfo.partialPriceWithVat === 0 || isFullPoolDiscount;

	$: paymentOptionsForItems = buildPaymentOptions(
		data.availablePaymentMethods ?? [],
		data.paymentSubtypes ?? [],
		showFreeOnlyForItems
	);
	$: paymentOptionsForShares = buildPaymentOptions(
		data.availablePaymentMethods ?? [],
		data.paymentSubtypes ?? [],
		showFreeOnlyForShares
	);

	$: paymentOptions =
		rightPannel === 'split-items' ? paymentOptionsForItems : paymentOptionsForShares;

	let selectedPaymentIndex = 0;
	$: selectedPayment = paymentOptions[selectedPaymentIndex] ?? paymentOptions[0];

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

	$: isPoolFullyPaid = data.sharesOrder?._id
		? data.sharesOrder.isFullyPaid
		: tab.items.every((item) => item.quantity === 0) &&
		  tab.items.some((item) => item.originalQuantity !== undefined);

	// Pool fully paid calculations (based on original quantities)
	$: itemsWithOriginalQuantities = tab.items.map((item) => ({
		...item,
		quantity: item.originalQuantity ?? item.quantity
	}));
	$: originalQuantitiesPriceInfo = computePriceInfo(itemsWithOriginalQuantities, priceConfig);
	$: originalTabTotalWithVat = originalQuantitiesPriceInfo.partialPriceWithVat;

	$: poolTotals =
		isPoolFullyPaid && hasOriginalQuantities
			? computePoolTotals(originalQuantitiesPriceInfo)
			: null;

	$: poolCurrency = tab.items[0]?.product.price.currency ?? UNDERLYING_CURRENCY;
	$: poolVatRates = [...new Set(originalQuantitiesPriceInfo.vatRates)];

	const modeParam = $page.url.searchParams.get('mode');
	let rightPannel: 'menu' | 'split-items' | 'split-shares' =
		modeParam === 'items' ? 'split-items' : modeParam === 'shares' ? 'split-shares' : 'menu';

	let isMobile = false;
	let isPortrait = false;
	let mobilePanel: 'pool' | 'payment' = 'pool';

	function checkMobileView() {
		if (typeof window !== 'undefined') {
			isMobile = window.innerWidth < data.posMobileBreakpoint;
			isPortrait = isMobile && window.innerHeight > window.innerWidth;
			if (!isMobile) {
				mobilePanel = 'pool';
			}
		}
	}

	onMount(() => {
		checkMobileView();
		window.addEventListener('resize', checkMobileView);
		return () => window.removeEventListener('resize', checkMobileView);
	});

	let fromCashInAll = false;
	$: itemizeDisabled = !!data.sharesOrder?.payments.some(
		(p) => p.splitMode === 'shares' && p.isPaid
	);
	$: showRightPanel =
		!isMobile || (rightPannel === 'menu' ? !isPortrait : mobilePanel === 'payment');

	$: if (isPoolFullyPaid && rightPannel === 'menu') {
		rightPannel = 'split-items';
	}

	$: if (rightPannel === 'menu') {
		fromCashInAll = false;
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

	function computePoolTotals(priceInfo: typeof tabItemsPriceInfo) {
		return priceInfo.perItem.reduce(
			(acc, perItem, i) => {
				const itemVat = perItem.amount * (priceInfo.vatRates[i] / 100);
				return {
					excl: acc.excl + perItem.amount,
					vat: acc.vat + itemVat,
					incl: acc.incl + perItem.amount + itemVat
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

	let ticketIframe: HTMLIFrameElement;

	// Prevent double-click on payment forms
	let submitting = false;
	const handlePaymentSubmit = () => {
		submitting = true;
		return async ({
			result,
			update
		}: {
			result: { type: string };
			update: () => Promise<void>;
		}) => {
			await update();
			// Only unlock on error/failure so user can retry; on redirect page will change anyway
			if (result.type === 'failure' || result.type === 'error') {
				submitting = false;
			}
		};
	};

	function handlePrintGlobalTicket() {
		ticketIframe?.contentWindow?.print();
	}
</script>

<div
	class="flex flex-col h-screen justify-between"
	class:pos-mobile={isMobile}
	use:swipe={{
		enabled: isMobile && rightPannel !== 'menu',
		onSwipeRight: () => mobilePanel === 'payment' && (mobilePanel = 'pool'),
		onSwipeLeft: () => mobilePanel === 'pool' && (mobilePanel = 'payment')
	}}
>
	<main class="mb-auto flex-grow min-h-0 overflow-y-auto">
		<div
			class="grid {isMobile && (rightPannel !== 'menu' || isPortrait)
				? 'grid-cols-1'
				: 'grid-cols-2'} grid-rows-[minmax(0,1fr)] gap-4 h-full"
		>
			{#if !isMobile || rightPannel === 'menu' || mobilePanel === 'pool'}
				<div class="touchScreen-ticket-menu flex flex-col justify-between p-3 h-full relative">
					{#if isMobile && rightPannel !== 'menu'}
						<button
							class="mobile-panel-toggle mobile-panel-toggle-right"
							on:click={() => (mobilePanel = 'payment')}
							aria-label="Show payment"
						>
							&lt;
						</button>
					{/if}
					{#if poolTotals}
						<div class="flex-1 overflow-y-auto min-h-0">
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
						<div class="shrink-0">
							<PosSplitTotalSection
								totalExcl={poolTotals.excl}
								totalIncl={poolTotals.incl}
								currency={poolCurrency}
								vatRates={poolVatRates}
							/>
						</div>
					{:else if tab.items.length}
						<div class="flex-1 overflow-y-auto min-h-0">
							<h3 class="font-semibold text-3xl">
								{t('pos.split.tabHeader', { poolLabel: data.poolLabel })}
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
						<div class="shrink-0">
							<PosSplitTotalSection
								totalExcl={tabItemsPriceInfo.partialPrice}
								totalIncl={tabItemsPriceInfo.partialPriceWithVat}
								currency={tabItemsPriceInfo.currency}
								vatRates={tabItemsPriceInfo.vat.map((vat) => vat.rate)}
							/>
						</div>
					{:else}
						<p>{t('cart.empty')}</p>
					{/if}
				</div>
			{/if}
			{#if showRightPanel}
				<div
					class="h-full relative {rightPannel === 'split-items'
						? 'bg-blue-50'
						: rightPannel === 'split-shares'
						? 'bg-yellow-50'
						: ''}"
				>
					{#if isMobile && rightPannel !== 'menu'}
						<button
							class="mobile-panel-toggle mobile-panel-toggle-left"
							on:click={() => (mobilePanel = 'pool')}
							aria-label="Show pool"
						>
							&gt;
						</button>
					{/if}
					{#if rightPannel === 'menu'}
						<div
							class="flex {isPortrait ? 'flex-row' : 'flex-col h-full'} {isMobile
								? 'gap-2'
								: 'gap-4'}"
						>
							<button
								class="flex-1 bg-green-800 hover:bg-green-900 text-white font-bold py-2 px-4 {isPortrait
									? 'text-xl'
									: 'text-6xl'}"
								on:click={() => ((fromCashInAll = true), (rightPannel = 'split-shares'))}
							>
								{t('pos.split.cashIn')}<br />({t('pos.split.all')})
							</button>
							<button
								class="flex-1 bg-yellow-800 hover:bg-yellow-900 text-white font-bold py-2 px-4 {isPortrait
									? 'text-xl'
									: 'text-6xl'}"
								on:click={() => ((fromCashInAll = false), (rightPannel = 'split-shares'))}
							>
								{t('pos.split.split')}<br />({t('pos.split.shares')})
							</button>
							<button
								class="flex-1 py-2 px-4 {isPortrait
									? 'text-xl'
									: 'text-6xl'} font-bold disabled:cursor-not-allowed disabled:text-gray-700 {itemizeDisabled
									? 'bg-gray-400'
									: 'bg-blue-800 hover:bg-blue-900 text-white'}"
								on:click={() => (rightPannel = 'split-items')}
								disabled={itemizeDisabled}
							>
								{t('pos.split.split')}<br />({t('pos.split.itemize')})
								{#if itemizeDisabled}
									<div class="text-sm mt-2" style="color: #864D0F;">
										<span class="text-2xl">⚠️</span>
										{t('pos.split.completeSharesFirst')}
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
										: t('pos.split.tabToPayNow', { poolLabel: data.poolLabel })}
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

							<!-- Payment method selector (hidden when pool is fully paid) -->
							{#if !isPoolFullyPaid}
								<div class="mt-6">
									<PosPaymentMethodSelector
										{paymentOptions}
										bind:selectedIndex={selectedPaymentIndex}
									/>
								</div>
							{/if}
						</div>
					{:else if rightPannel === 'split-shares'}
						<div class="flex flex-col h-full gap-4 p-4 overflow-y-auto">
							{#if !data.sharesOrder?.isFullyPaid}
								<PosPaymentMethodSelector
									{paymentOptions}
									bind:selectedIndex={selectedPaymentIndex}
								/>

								<div class="grid grid-cols-3 gap-3">
									{#each Array.from({ length: POS_SPLIT_SHARES_MAX_NUMS }, (_, i) => i + 1) as num}
										<form
											method="POST"
											action="?/checkoutTabPartial"
											use:enhance={handlePaymentSubmit}
										>
											<input type="hidden" name="paymentMethod" value={selectedPayment?.method} />
											{#if selectedPayment?.subtype}
												<input type="hidden" name="subtype" value={selectedPayment.subtype} />
											{/if}
											{#if num === 1}
												<input type="hidden" name="mode" value="custom-amount" />
												<input
													type="hidden"
													name="customAmount"
													value={data.sharesOrder?._id
														? data.sharesOrder.remainingToPay
														: tabItemsPriceInfo.partialPriceWithVat}
												/>
											{:else}
												<input type="hidden" name="mode" value="equal" />
												<input type="hidden" name="shares" value={num} />
											{/if}
											<button
												type="submit"
												disabled={submitting}
												class="{num === 1 && fromCashInAll
													? 'bg-green-800'
													: 'bg-yellow-800'} text-white font-bold text-4xl p-4 rounded w-full disabled:opacity-50"
											>
												{num}
											</button>
										</form>
									{/each}
								</div>

								<form method="POST" action="?/checkoutTabPartial" use:enhance={handlePaymentSubmit}>
									<input type="hidden" name="paymentMethod" value={selectedPayment?.method} />
									{#if selectedPayment?.subtype}
										<input type="hidden" name="subtype" value={selectedPayment.subtype} />
									{/if}
									<input type="hidden" name="mode" value="custom-amount" />
									<input
										type="hidden"
										name="customAmount"
										value={data.sharesOrder?._id
											? data.sharesOrder.remainingToPay
											: originalTabTotalWithVat -
											  toCurrency(
													UNDERLYING_CURRENCY,
													data.sharesOrder?.totalAlreadyPaid ?? 0,
													poolCurrency
											  )}
									/>
									<button
										type="submit"
										disabled={submitting}
										class="w-full bg-green-800 text-white font-bold py-4 text-3xl rounded disabled:opacity-50"
									>
										{t('pos.split.payRemaining') || 'Pay Remaining'}
									</button>
								</form>

								<button
									class="w-full bg-yellow-800 text-white font-bold py-4 text-3xl rounded"
									on:click={() => (showCustomShares = !showCustomShares)}
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
											use:enhance={handlePaymentSubmit}
											on:submit={() => (showCustomShares = false)}
										>
											<input type="hidden" name="paymentMethod" value={selectedPayment?.method} />
											{#if selectedPayment?.subtype}
												<input type="hidden" name="subtype" value={selectedPayment.subtype} />
											{/if}
											<input type="hidden" name="mode" value="equal" />
											<input type="hidden" name="shares" bind:value={sharesInput} />
											<button
												type="submit"
												disabled={submitting}
												class="bg-green-800 text-white px-8 text-3xl rounded disabled:opacity-50"
											>
												{t('pos.split.ok')}
											</button>
										</form>
									</div>
								{/if}

								<button
									class="w-full bg-yellow-800 text-white font-bold py-4 text-3xl rounded"
									on:click={() => (showCustomAmount = !showCustomAmount)}
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
											use:enhance={handlePaymentSubmit}
											on:submit={() => (showCustomAmount = false)}
										>
											<input type="hidden" name="paymentMethod" value={selectedPayment?.method} />
											{#if selectedPayment?.subtype}
												<input type="hidden" name="subtype" value={selectedPayment.subtype} />
											{/if}
											<input type="hidden" name="mode" value="custom-amount" />
											<input type="hidden" name="customAmount" bind:value={customAmountInput} />
											<button
												type="submit"
												disabled={submitting}
												class="bg-green-800 text-white px-8 text-3xl rounded disabled:opacity-50"
											>
												{t('pos.split.ok')}
											</button>
										</form>
									</div>
								{/if}
							{/if}

							{#if data.sharesOrder}
								<div class="bg-gray-100 p-6 rounded-lg space-y-3">
									<div class="text-3xl font-semibold">{t('pos.split.totalAlreadyPaid')}</div>
									{#if tab.items.some((item) => item.discountPercentage)}
										<!-- Show strikethrough undiscounted price -->
										<div class="text-3xl font-bold line-through text-gray-500">
											<PriceTag
												amount={originalTabTotalWithVat}
												currency={UNDERLYING_CURRENCY}
												main
											/>
										</div>
									{/if}
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
										{@const remaining =
											data.sharesOrder.remainingToPay ??
											originalTabTotalWithVat -
												toCurrency(
													UNDERLYING_CURRENCY,
													data.sharesOrder.totalAlreadyPaid,
													data.sharesOrder.currency
												)}
										<div class="text-3xl font-semibold">{t('pos.split.remainingToPay')}</div>
										<div class="text-4xl font-bold text-red-600">
											<PriceTag
												amount={remaining}
												currency={data.sharesOrder.remainingToPay !== null
													? data.sharesOrder.currency
													: UNDERLYING_CURRENCY}
												main
											/>
										</div>
									{/if}
								</div>
							{/if}

							{#if data.sharesOrder?.payments && data.sharesOrder.payments.length > 0}
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
									returnTo={`/pos/touch/tab/${tabSlug}/split?mode=shares`}
								/>

								<PosPaymentsList
									payments={sharesPayments}
									title="Split by shares"
									bgClass="bg-gray-100"
									returnTo={`/pos/touch/tab/${tabSlug}/split?mode=shares`}
								/>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</main>
	{#if isPortrait && rightPannel === 'menu'}
		<div class="shrink-0 px-2 py-1">
			<div class="flex flex-row gap-2">
				<button
					class="flex-1 bg-green-800 hover:bg-green-900 text-white font-bold py-2 px-4 text-xl"
					on:click={() => (
						(fromCashInAll = true), (rightPannel = 'split-shares'), (mobilePanel = 'payment')
					)}
				>
					{t('pos.split.cashIn')}<br />({t('pos.split.all')})
				</button>
				<button
					class="flex-1 bg-yellow-800 hover:bg-yellow-900 text-white font-bold py-2 px-4 text-xl"
					on:click={() => (
						(fromCashInAll = false), (rightPannel = 'split-shares'), (mobilePanel = 'payment')
					)}
				>
					{t('pos.split.split')}<br />({t('pos.split.shares')})
				</button>
				<button
					class="flex-1 py-2 px-4 text-xl font-bold disabled:cursor-not-allowed disabled:text-gray-700 {itemizeDisabled
						? 'bg-gray-400'
						: 'bg-blue-800 hover:bg-blue-900 text-white'}"
					on:click={() => (rightPannel = 'split-items')}
					disabled={itemizeDisabled}
				>
					{t('pos.split.split')}<br />({t('pos.split.itemize')})
				</button>
			</div>
		</div>
	{/if}
	<footer class="shrink-0">
		<div
			class="grid {isMobile && rightPannel !== 'menu' ? 'grid-cols-1' : 'grid-cols-2'} {isMobile
				? 'gap-2 mt-1'
				: 'gap-4 mt-2'}"
		>
			{#if isPoolFullyPaid}
				<button
					class="bg-blue-800 hover:bg-blue-900 uppercase {isMobile
						? 'text-xl p-2'
						: 'text-3xl p-4'} text-white text-center"
					on:click={handlePrintGlobalTicket}
				>
					{t('pos.split.globalTicket')}
				</button>
				<form method="POST" action="?/closePool" use:enhance>
					<button
						type="submit"
						class="bg-green-800 hover:bg-green-900 uppercase {isMobile
							? 'text-xl p-2'
							: 'text-3xl p-4'} text-white text-center w-full"
					>
						{t('pos.split.closePool')}
					</button>
				</form>
			{:else if rightPannel === 'menu'}
				<a
					class="touchScreen-action-cancel uppercase {isMobile
						? 'text-xl p-2'
						: 'text-3xl p-4'} text-white text-center"
					href="/pos/touch/tab/{tabSlug}"
				>
					{t('pos.split.return')}
				</a>
				<button
					class="bg-green-800 hover:bg-green-900 uppercase {isMobile
						? 'text-xl p-2'
						: 'text-3xl p-4'} text-white text-center"
					on:click={handlePrintGlobalTicket}
				>
					{t('pos.split.globalTicket')}
				</button>
			{:else}
				<button
					class="touchScreen-action-cancel uppercase {isMobile
						? 'text-xl p-2'
						: 'text-3xl p-4'} text-white text-center"
					on:click={() => (rightPannel = 'menu')}
				>
					{t('pos.split.return')}
				</button>
			{/if}
			{#if rightPannel === 'split-items' && !isPoolFullyPaid}
				<form
					method="POST"
					action="?/checkoutTabPartial"
					use:enhance={handlePaymentSubmit}
					on:submit={validateItemsCheckout}
				>
					<input type="hidden" name="itemQuantities" value={itemQuantitiesJson} />
					<input type="hidden" name="paymentMethod" value={selectedPayment?.method} />
					{#if selectedPayment?.subtype}
						<input type="hidden" name="subtype" value={selectedPayment.subtype} />
					{/if}
					<button
						type="submit"
						class="uppercase {isMobile
							? 'text-xl p-2'
							: 'text-3xl p-4'} text-center w-full {splitTabPriceInfo.partialPriceWithVat > 0 ||
						selectedPayment?.method === 'free'
							? 'touchScreen-action-cta'
							: 'bg-gray-400 text-white cursor-not-allowed'} disabled:opacity-50"
						disabled={submitting ||
							(splitTabPriceInfo.partialPriceWithVat === 0 && selectedPayment?.method !== 'free')}
					>
						{t('pos.split.paySelected')}
					</button>
				</form>
			{/if}
		</div>
	</footer>
</div>

<iframe
	src="/pos/touch/tab/{tabSlug}/ticket"
	style="width: 1px; height: 1px; position: absolute; left: -1000px; top: -1000px;"
	title="Global Ticket"
	bind:this={ticketIframe}
/>
