<script lang="ts">
	import { computePriceInfo } from '$lib/cart';
	import PosSplitTotalSection from '$lib/components/PosSplitTotalSection.svelte';
	import PosSplitItemRow from '$lib/components/PosSplitItemRow.svelte';
	import PoolDropdown from '$lib/components/PoolDropdown.svelte';
	import { useI18n } from '$lib/i18n';
	import { UNDERLYING_CURRENCY } from '$lib/types/Currency.js';
	import { invalidate } from '$app/navigation';
	import { UrlDependency } from '$lib/types/UrlDependency';
	import { enhance } from '$app/forms';
	import { swipe } from '$lib/utils/swipe';
	import { onMount } from 'svelte';
	import type { Price } from '$lib/types/Order';

	const { t } = useI18n();

	let isMobile = false;
	let mobilePanel: 'left' | 'right' = 'left';

	function checkMobileView() {
		isMobile = window.innerWidth < mobileBreakpoint;
		if (!isMobile) {
			mobilePanel = 'left';
		}
	}

	onMount(() => {
		checkMobileView();
		window.addEventListener('resize', checkMobileView);
		return () => window.removeEventListener('resize', checkMobileView);
	});

	type HydratedItem = {
		_id: string;
		product: { _id: string; name: string; price: Price; vatProfileId?: string; shipping: boolean };
		quantity: number;
		internalNote?: { value: string; updatedAt: Date };
	};

	async function fetchTabItems(slug: string): Promise<HydratedItem[]> {
		const res = await fetch(`/pos/touch/tab/${slug}/items`);
		if (!res.ok) {
			return [];
		}
		return res.json();
	}

	export let isOpen = false;
	export let currentTabSlug: string;
	export let availableTabs: Array<{ slug: string; name: string }>;
	export let allOrderTabs: Array<{ slug: string; itemsCount?: number }>;
	export let priceConfig: Parameters<typeof computePriceInfo>[1];
	export let emptyIcon: string | undefined = '✅';
	export let occupiedIcon: string | undefined = '⏳';
	export let onClose: () => void;
	export let mobileBreakpoint = 1024;

	// State for tab selection
	let leftTabSlug: string;
	let rightTabSlug: string;

	// Sync with currentTabSlug reactively
	$: leftTabSlug = currentTabSlug;
	$: rightTabSlug = availableTabs.find((tab) => tab.slug !== currentTabSlug)?.slug ?? '';

	// Pending changes (itemId → delta quantity)
	let pendingMoves = new Map<string, { from: string; to: string; quantity: number }>();

	// Hydrated items state
	let leftTabItems: HydratedItem[] = [];
	let rightTabItems: HydratedItem[] = [];

	// Grouped items by productId with display quantities
	let displayLeftItemsGrouped: Array<HydratedItem & { displayQty: number; itemIds: string[] }> = [];
	let displayRightItemsGrouped: Array<HydratedItem & { displayQty: number; itemIds: string[] }> =
		[];

	// Group items by productId with display quantities
	$: (displayLeftItemsGrouped = groupItemsByProduct(
		[...leftTabItems, ...rightTabItems.filter((i) => pendingMoves.get(i._id)?.to === leftTabSlug)],
		leftTabSlug
	)),
		pendingMoves.size;
	$: (displayRightItemsGrouped = groupItemsByProduct(
		[...rightTabItems, ...leftTabItems.filter((i) => pendingMoves.get(i._id)?.to === rightTabSlug)],
		rightTabSlug
	)),
		pendingMoves.size;

	function groupItemsByProduct(items: HydratedItem[], currentSlug: string) {
		const grouped = new Map<string, HydratedItem & { displayQty: number; itemIds: string[] }>();

		items.forEach((item) => {
			const displayQty = getDisplayQuantity(item._id, item.quantity, currentSlug);
			if (displayQty <= 0) {
				return;
			}

			const productId = item.product._id;
			const existing = grouped.get(productId);
			if (existing) {
				existing.displayQty += displayQty;
				existing.itemIds.push(item._id);
			} else {
				grouped.set(productId, { ...item, displayQty, itemIds: [item._id] });
			}
		});

		return Array.from(grouped.values());
	}

	// Fetch items when modal opens OR tabs change
	$: if (isOpen) {
		if (leftTabSlug) {
			fetchTabItems(leftTabSlug).then((items) => {
				leftTabItems = items;
			});
		}
		if (rightTabSlug) {
			fetchTabItems(rightTabSlug).then((items) => {
				rightTabItems = items;
			});
		}
	}

	// Handle tab selection change - clear pending moves ONLY when user changes dropdown
	function handleTabChange(side: 'left' | 'right', slug: string) {
		if (side === 'left') {
			leftTabSlug = slug;
		} else {
			rightTabSlug = slug;
		}

		pendingMoves.clear();
		pendingMoves = pendingMoves;
	}

	// Universal move functions
	function moveOne(itemId: string, from: string, to: string) {
		const existing = pendingMoves.get(itemId);

		if (existing) {
			if (existing.from === from && existing.to === to) {
				existing.quantity += 1;
			} else if (existing.from === to && existing.to === from) {
				existing.quantity -= 1;
				if (existing.quantity <= 0) {
					pendingMoves.delete(itemId);
					pendingMoves = pendingMoves;
					return;
				}
			}
		} else {
			pendingMoves.set(itemId, { from, to, quantity: 1 });
		}

		pendingMoves = pendingMoves;
	}

	function moveAll(itemId: string, from: string, to: string) {
		const originalQty =
			leftTabItems.find((i) => i._id === itemId)?.quantity ??
			rightTabItems.find((i) => i._id === itemId)?.quantity ??
			0;

		const existing = pendingMoves.get(itemId);
		if (existing && existing.from === to && existing.to === from) {
			pendingMoves.delete(itemId);
		} else {
			pendingMoves.set(itemId, { from, to, quantity: originalQty });
		}

		pendingMoves = pendingMoves;
	}

	// Compute display quantities with pending changes
	function getDisplayQuantity(itemId: string, originalQty: number, currentSlug: string): number {
		const pending = pendingMoves.get(itemId);
		if (!pending) {
			return originalQty;
		}

		// If this is the FROM pool, subtract quantity
		if (pending.from === currentSlug) {
			return originalQty - pending.quantity;
		}

		// If this is the TO pool, add quantity
		if (pending.to === currentSlug) {
			// Check if item was originally in THIS pool
			const wasInThisPool =
				(currentSlug === leftTabSlug && leftTabItems.find((i) => i._id === itemId)) ||
				(currentSlug === rightTabSlug && rightTabItems.find((i) => i._id === itemId));
			const baseQty = wasInThisPool ? originalQty : 0;
			return baseQty + pending.quantity;
		}

		return originalQty;
	}

	// Price calculations using grouped items (already computed display quantities)
	$: leftTabPriceInfo = computePriceInfo(
		displayLeftItemsGrouped.map((item) => ({ ...item, quantity: item.displayQty })),
		priceConfig
	);
	$: rightTabPriceInfo = computePriceInfo(
		displayRightItemsGrouped.map((item) => ({ ...item, quantity: item.displayQty })),
		priceConfig
	);

	// Prepare data for submission
	$: movesJson = JSON.stringify(
		Array.from(pendingMoves.entries())
			.filter(([, move]) => move.quantity !== 0)
			.map(([itemId, move]) => ({
				itemId,
				from: move.from,
				to: move.to,
				quantity: move.quantity
			}))
	);

	let saveError = '';
</script>

{#if isOpen}
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
		<div
			class="bg-white w-full h-full flex flex-col"
			class:pos-mobile={isMobile}
			use:swipe={{
				enabled: isMobile,
				onSwipeLeft: () => (mobilePanel = 'right'),
				onSwipeRight: () => (mobilePanel = 'left')
			}}
		>
			<!-- Header with dropdowns -->
			<header class="bg-gray-800">
				{#if isMobile}
					{#if mobilePanel === 'left'}
						<PoolDropdown
							pools={availableTabs}
							selectedSlug={leftTabSlug}
							{allOrderTabs}
							{emptyIcon}
							{occupiedIcon}
							disabledSlugs={[rightTabSlug]}
							onSelect={(slug) => handleTabChange('left', slug)}
						/>
					{:else}
						<PoolDropdown
							pools={availableTabs}
							selectedSlug={rightTabSlug}
							{allOrderTabs}
							{emptyIcon}
							{occupiedIcon}
							disabledSlugs={[leftTabSlug]}
							onSelect={(slug) => handleTabChange('right', slug)}
						/>
					{/if}
				{:else}
					<div class="grid grid-cols-2 gap-4">
						<PoolDropdown
							pools={availableTabs}
							selectedSlug={leftTabSlug}
							{allOrderTabs}
							{emptyIcon}
							{occupiedIcon}
							disabledSlugs={[rightTabSlug]}
							onSelect={(slug) => handleTabChange('left', slug)}
						/>
						<PoolDropdown
							pools={availableTabs}
							selectedSlug={rightTabSlug}
							{allOrderTabs}
							{emptyIcon}
							{occupiedIcon}
							disabledSlugs={[leftTabSlug]}
							onSelect={(slug) => handleTabChange('right', slug)}
						/>
					</div>
				{/if}
			</header>

			<!-- Main content -->
			<main class="flex-grow overflow-y-auto relative">
				{#if isMobile}
					<button
						class="mobile-panel-toggle mobile-panel-toggle-left"
						on:click={() => (mobilePanel = 'left')}
						aria-label="Show left pool"
						style:display={mobilePanel === 'right' ? 'block' : 'none'}
					>
						&lt;
					</button>
					<button
						class="mobile-panel-toggle mobile-panel-toggle-right"
						on:click={() => (mobilePanel = 'right')}
						aria-label="Show right pool"
						style:display={mobilePanel === 'left' ? 'block' : 'none'}
					>
						&gt;
					</button>
				{/if}

				<div class="grid {isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 h-full">
					<!-- Left panel -->
					{#if !isMobile || mobilePanel === 'left'}
						<div class="flex flex-col justify-between p-3 h-full overflow-y-auto bg-gray-50">
							<div>
								<h3 class="font-semibold {isMobile ? 'text-xl mb-2' : 'text-3xl mb-4'}">
									{availableTabs.find((tab) => tab.slug === leftTabSlug)?.name ?? leftTabSlug}
								</h3>
								{#each displayLeftItemsGrouped as item}
									{@const itemId = item.itemIds[0]}
									{@const displayQty = item.displayQty}
									{@const priceInfo = {
										amount: (item.product?.price?.amount ?? 0) * displayQty,
										currency: item.product?.price?.currency ?? UNDERLYING_CURRENCY
									}}

									<PosSplitItemRow
										{item}
										quantity={displayQty}
										{priceInfo}
										vatRate={8.1}
										controls="move-to-cart"
										isComplete={displayQty === 0}
										onMoveOne={() => moveOne(itemId, leftTabSlug, rightTabSlug)}
										onMoveAll={() => {
											item.itemIds.forEach((id) => moveAll(id, leftTabSlug, rightTabSlug));
										}}
									/>
								{/each}
							</div>
							<PosSplitTotalSection
								totalExcl={leftTabPriceInfo.partialPrice}
								totalIncl={leftTabPriceInfo.partialPriceWithVat}
								currency={leftTabPriceInfo.currency}
								vatRates={leftTabPriceInfo.vat.map((vat) => vat.rate)}
							/>
						</div>
					{/if}

					<!-- Right panel -->
					{#if !isMobile || mobilePanel === 'right'}
						<div class="flex flex-col justify-between p-3 h-full overflow-y-auto bg-blue-50">
							<div>
								<h3 class="font-semibold {isMobile ? 'text-xl mb-2' : 'text-3xl mb-4'}">
									{availableTabs.find((tab) => tab.slug === rightTabSlug)?.name ?? rightTabSlug}
								</h3>
								{#each displayRightItemsGrouped as item}
									{@const itemId = item.itemIds[0]}
									{@const displayQty = item.displayQty}
									{@const priceInfo = {
										amount: (item.product?.price?.amount ?? 0) * displayQty,
										currency: item.product?.price?.currency ?? UNDERLYING_CURRENCY
									}}

									<PosSplitItemRow
										{item}
										quantity={displayQty}
										{priceInfo}
										vatRate={8.1}
										controls="return-to-pool"
										onReturnOne={() => moveOne(itemId, rightTabSlug, leftTabSlug)}
										onReturnAll={() => {
											item.itemIds.forEach((id) => moveAll(id, rightTabSlug, leftTabSlug));
										}}
									/>
								{/each}
							</div>
							<PosSplitTotalSection
								totalExcl={rightTabPriceInfo.partialPrice}
								totalIncl={rightTabPriceInfo.partialPriceWithVat}
								currency={rightTabPriceInfo.currency}
								vatRates={rightTabPriceInfo.vat.map((vat) => vat.rate)}
							/>
						</div>
					{/if}
				</div>
			</main>

			<!-- Footer: Cancel + Save -->
			<footer class="bg-gray-100 {isMobile ? 'p-2' : 'p-4'}">
				{#if saveError}
					<div class="bg-red-100 border-2 border-red-400 p-3 rounded mb-4 text-center">
						<p class="text-red-600 text-xl">{saveError}</p>
					</div>
				{/if}

				<div class="grid grid-cols-2 {isMobile ? 'gap-2' : 'gap-4'}">
					<button
						type="button"
						class="bg-gray-600 hover:bg-gray-700 text-white {isMobile
							? 'text-xl p-2'
							: 'text-3xl p-4'} rounded uppercase"
						on:click={onClose}
					>
						{t('pos.touch.cancel')}
					</button>

					<form
						method="POST"
						action="?/moveItems"
						use:enhance={() => {
							saveError = '';
							return async ({ result }) => {
								if (result.type === 'error') {
									saveError = result.error?.message || 'Failed to move items';
									return;
								}
								if (result.type === 'failure') {
									saveError =
										(result.data && typeof result.data === 'object' && 'message' in result.data
											? String(result.data.message)
											: null) || 'Failed to move items';
									return;
								}
								await invalidate(UrlDependency.orderTab(currentTabSlug));
								onClose();
							};
						}}
					>
						<input type="hidden" name="moves" value={movesJson} />
						<button
							type="submit"
							class="bg-green-600 hover:bg-green-700 text-white {isMobile
								? 'text-xl p-2'
								: 'text-3xl p-4'} rounded uppercase w-full"
							disabled={pendingMoves.size === 0}
						>
							{t('pos.touch.save')}
						</button>
					</form>
				</div>
			</footer>
		</div>
	</div>
{/if}
