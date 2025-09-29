<script lang="ts">
	import { computePriceInfo } from '$lib/cart';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { useI18n } from '$lib/i18n';
	import { UNDERLYING_CURRENCY } from '$lib/types/Currency.js';

	export let data;
	const tabSlug = data.tabSlug;
	$: tab = data.orderTab;
	$: tabItemsPriceInfo = computePriceInfo(tab.items, {
		bebopCountry: data.vatCountry,
		deliveryFees: { amount: 0, currency: UNDERLYING_CURRENCY },
		freeProductUnits: {},
		userCountry: data.countryCode,
		vatExempted: data.vatExempted,
		vatNullOutsideSellerCountry: data.vatNullOutsideSellerCountry,
		vatSingleCountry: data.vatSingleCountry,
		vatProfiles: data.vatProfiles
	});

	/**
	 * This symbol borrows the indexing of the tab items and contains the
	 * quantities of each item.
	 */
	let splitTabQuantities = data.orderTab.items.map(() => 0);
	$: {
		if (tab.items) {
			splitTabQuantities = data.orderTab.items.map(() => 0);
		}
	}
	$: splitTabItems = tab.items.map((item, i) => ({ ...item, quantity: splitTabQuantities[i] }));
	$: splitTabPriceInfo = computePriceInfo(splitTabItems, {
		bebopCountry: data.vatCountry,
		deliveryFees: { amount: 0, currency: UNDERLYING_CURRENCY },
		freeProductUnits: {},
		userCountry: data.countryCode,
		vatExempted: data.vatExempted,
		vatNullOutsideSellerCountry: data.vatNullOutsideSellerCountry,
		vatSingleCountry: data.vatSingleCountry,
		vatProfiles: data.vatProfiles
	});

	let rightPannel: 'menu' | 'split-items' | 'split-shares' = 'menu';
	let itemAction: (index: number) => void = () => {};
	let rightPannelItemAction: (index: number) => void = () => {};
	function rightPannelMenu() {
		rightPannel = 'menu';
		itemAction = () => {};
		rightPannelItemAction = () => {};
	}
	function rightPannelSplitItems() {
		rightPannel = 'split-items';
		itemAction = (index: number) => {
			const maxQty = data.orderTab.items[index].quantity;
			const currQty = splitTabQuantities[index];
			const newQty = Math.min(currQty + 1, maxQty);
			if (newQty !== currQty) {
				splitTabQuantities[index] = newQty;
			}
		};
		rightPannelItemAction = (index: number) => {
			const currQty = splitTabQuantities[index];
			const newQty = Math.max(currQty - 1, 0);
			if (newQty !== currQty) {
				splitTabQuantities[index] = newQty;
			}
		};
	}
	function rightPannelSplitShares() {
		if (true) {
			alert('@@Not available yet');
			return;
		}
		rightPannel = 'split-shares';
	}
	function checkoutSplitPayment() {
		alert('@@Not available yet');
		return;
	}
	const { t } = useI18n();
</script>

<div class="flex flex-col h-screen justify-between">
	<main class="mb-auto flex-grow">
		<div class="grid grid-cols-2 gap-4 h-full">
			<div class="touchScreen-ticket-menu flex flex-col justify-between p-3 h-full">
				{#if tab.items.length}
					<div>
						<h3 class="font-semibold text-3xl">@@Tab {tab.slug}</h3>
						{#each tab.items as item, i}
							{@const itemPrice = tabItemsPriceInfo.perItem[i]}
							{@const itemVatRate = tabItemsPriceInfo.vatRates[i]}
							<div class="flex flex-col py-3 gap-4">
								<button
									class="text-start text-2xl w-full justify-between"
									on:click={() => itemAction(i)}
								>
									{item.quantity} X {item.product.name.toUpperCase()}<br />
									{item.internalNote?.value ? '+' + item.internalNote.value : ''}
									<div class="grid grid-cols-4 w-full items-center justify-around text-xl">
										<div>@@excl. VAT</div>
										<PriceTag amount={itemPrice.amount} currency={itemPrice.currency} main />
										<div>@@VAT {itemVatRate}%</div>
										<PriceTag
											amount={itemPrice.amount * itemVatRate}
											currency={itemPrice.currency}
											main
										/>
									</div>
								</button><br />
							</div>
						{/each}
					</div>
					<div class="flex flex-col border-t border-gray-300 py-6 w-fit">
						<h2 class="text-3xl underline uppercase">{t('cart.total')}</h2>
						<div class="grid grid-cols-2 gap-4 grid-rows-2 justify-start">
							<div class="text-2xl">@@excl. VAT</div>
							<PriceTag
								amount={tabItemsPriceInfo.partialPrice}
								currency={tabItemsPriceInfo.currency}
								main
								class="text-2xl"
							/>
							<div class="text-2xl">
								@@incl. VAT {tabItemsPriceInfo.vat.map((vat) => `${vat.rate}%`).join(', ')}
							</div>
							<PriceTag
								amount={tabItemsPriceInfo.partialPriceWithVat}
								currency={tabItemsPriceInfo.currency}
								main
								class="text-2xl"
							/>
						</div>
					</div>
				{:else}
					<p>{t('cart.empty')}</p>
				{/if}
			</div>
			<div class="h-full">
				{#if rightPannel === 'menu'}
					<div class="flex flex-col h-full gap-4">
						<form
							action="/pos?/checkoutTab"
							class="flex-1 flex justify-center bg-green-800 hover:bg-green-900"
							method="POST"
						>
							<input type="hidden" name="tabSlug" value={tabSlug} />
							<button class="text-white font-bold py-2 px-4 text-6xl" type="submit">
								@@Cash in<br />(all)
							</button>
						</form>
						<button
							class="flex-1 bg-blue-800 hover:bg-blue-900 text-white font-bold py-2 px-4 text-6xl"
							on:click={rightPannelSplitShares}
						>
							@@Split<br />(shares)
						</button>
						<button
							class="flex-1 bg-yellow-800 hover:bg-yellow-900 text-white font-bold py-2 px-4 text-6xl"
							on:click={rightPannelSplitItems}
						>
							@@Split<br />(itemize)
						</button>
					</div>
				{:else if rightPannel === 'split-items'}
					<div class="touchScreen-ticket-menu flex flex-col justify-between p-3 h-full">
						<div>
							<h3 class="font-semibold text-3xl">@@Tab {tab.slug} (to pay now)</h3>
							{#each splitTabItems as item, i}
								{@const itemPrice = splitTabPriceInfo.perItem[i]}
								{@const itemVatRate = splitTabPriceInfo.vatRates[i]}
								<div class="flex flex-col py-3 gap-4">
									<button
										class="text-start text-2xl w-full justify-between"
										on:click={() => rightPannelItemAction(i)}
									>
										{item.quantity} X {item.product.name.toUpperCase()}<br />
										{item.internalNote?.value ? '+' + item.internalNote.value : ''}
										<div class="grid grid-cols-4 w-full items-center justify-around text-xl">
											<div>@@excl. VAT</div>
											<PriceTag amount={itemPrice.amount} currency={itemPrice.currency} main />
											<div>@@VAT {itemVatRate}%</div>
											<PriceTag
												amount={itemPrice.amount * itemVatRate}
												currency={itemPrice.currency}
												main
											/>
										</div>
									</button><br />
								</div>
							{/each}
						</div>
						<div class="flex flex-col border-t border-gray-300 py-6 w-fit">
							<h2 class="text-3xl underline uppercase">{t('cart.total')}</h2>
							<div class="grid grid-cols-2 gap-4 grid-rows-2 justify-start">
								<div class="text-2xl">@@excl. VAT</div>
								<PriceTag
									amount={splitTabPriceInfo.partialPrice}
									currency={splitTabPriceInfo.currency}
									main
									class="text-2xl"
								/>
								<div class="text-2xl">
									@@incl. VAT {splitTabPriceInfo.vat.map((vat) => `${vat.rate}%`).join(', ')}
								</div>
								<PriceTag
									amount={splitTabPriceInfo.partialPriceWithVat}
									currency={splitTabPriceInfo.currency}
									main
									class="text-2xl"
								/>
							</div>
						</div>
					</div>
				{:else if rightPannel === 'split-shares'}
					@@TODO: Split shares
				{/if}
			</div>
		</div>
	</main>
	<footer>
		<div class="grid grid-cols-2 gap-4 mt-2">
			{#if rightPannel === 'menu'}
				<a
					class="touchScreen-action-cancel uppercase text-3xl text-white p-4 text-center"
					href="/pos/touch/tab/{tabSlug}"
				>
					@@Return
				</a>
			{:else}
				<button
					class="touchScreen-action-cancel uppercase text-3xl text-white p-4 text-center"
					on:click={rightPannelMenu}
				>
					@@Return<br />
				</button>
			{/if}
			{#if rightPannel === 'split-items' && splitTabPriceInfo.partialPriceWithVat > 0}
				<button
					class="touchScreen-action-cta uppercase text-3xl text-white p-4 text-center"
					on:click={checkoutSplitPayment}
				>
					@@Pay selected
				</button>
			{/if}
		</div>
	</footer>
</div>
