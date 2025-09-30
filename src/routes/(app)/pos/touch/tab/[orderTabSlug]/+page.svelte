<script lang="ts">
	import type { SetRequired } from 'type-fest';
	import type { Picture } from '$lib/types/Picture';
	import ProductWidgetPOS from '$lib/components/ProductWidget/ProductWidgetPOS.svelte';
	import { POS_PRODUCT_PAGINATION, isPreorder } from '$lib/types/Product';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import { UrlDependency } from '$lib/types/UrlDependency.js';
	import { groupBy } from '$lib/utils/group-by.js';
	import { onMount } from 'svelte';
	import ItemEditDialog from '$lib/components/ItemEditDialog.svelte';
	import { computePriceInfo } from '$lib/cart.js';
	import { UNDERLYING_CURRENCY } from '$lib/types/Currency.js';
	import { sluggifyTab } from '$lib/types/PosTabGroup.js';

	export let data;
	$: tabSlug = data.tabSlug;
	$: next = Number($page.url.searchParams.get('skip')) || 0;
	$: picturesByProduct = groupBy(
		data.pictures.filter(
			(picture): picture is SetRequired<Picture, 'productId'> => !!picture.productId
		),
		(p) => p.productId
	);
	$: filter = $page.url.searchParams.get('filter') ?? 'pos-favorite';
	$: productFiltered =
		filter === 'all'
			? data.products
			: data.products.filter((product) => product.tagIds?.includes(filter));
	$: items = data.orderTab.items;
	$: priceInfo = computePriceInfo(items, {
		bebopCountry: data.vatCountry,
		deliveryFees: { amount: 0, currency: UNDERLYING_CURRENCY },
		freeProductUnits: {},
		userCountry: data.countryCode,
		vatExempted: data.vatExempted,
		vatNullOutsideSellerCountry: data.vatNullOutsideSellerCountry,
		vatSingleCountry: data.vatSingleCountry,
		vatProfiles: data.vatProfiles
	});

	const { t } = useI18n();
	let posProductPagination = POS_PRODUCT_PAGINATION;

	$: displayedProducts = productFiltered.slice(next, next + posProductPagination);
	$: totalPages = Math.ceil(productFiltered.length / posProductPagination);
	$: currentPage = Math.floor(next / posProductPagination) + 1;

	let itemToEditIndex: number | undefined = undefined;

	function openEditItemDialog(itemIndex: number) {
		itemToEditIndex = itemIndex;
	}

	async function concludeEditItem(payload: { note?: string; quantity?: number }) {
		if (itemToEditIndex === undefined || Object.keys(payload).length === 0) {
			itemToEditIndex = undefined;
			return;
		}
		const form = formNotes.at(itemToEditIndex);
		if (form) {
			const note = payload.note ?? items[itemToEditIndex].internalNote?.value ?? '';
			const notesInput = form.querySelector('input[name="note"]');
			if (notesInput && notesInput instanceof HTMLInputElement) {
				notesInput.value = note;
			}
			const quantity = payload.quantity ?? items[itemToEditIndex].quantity;
			const quantityInput = form.querySelector('input[name="quantity"]');
			if (quantityInput && quantityInput instanceof HTMLInputElement) {
				quantityInput.value = quantity.toString();
			}
			form.submit();
		}
		itemToEditIndex = undefined;
	}

	let formNotes: HTMLFormElement[] = [];
	let warningMessage = '';

	function updatePaginationLimit() {
		const width = window.screen.width;

		if (width < 480) {
			posProductPagination = 22;
		} else if (width < 768) {
			posProductPagination = 16;
		} else if (width < 1024) {
			posProductPagination = 14;
		} else {
			posProductPagination = 10;
		}
	}

	function selfPageLink(params: Record<string, { toString(): string }>): string {
		const search = new URLSearchParams($page.url.searchParams);
		for (const [key, value] of Object.entries(params)) {
			search.set(key, value.toString());
		}
		return `?${search.toString()}`;
	}

	onMount(() => {
		updatePaginationLimit();
		window.addEventListener('resize', updatePaginationLimit);

		return () => window.removeEventListener('resize', updatePaginationLimit);
	});

	let tabSelectModalOpen = false;
	function closeTabSelectModel() {
		tabSelectModalOpen = false;
	}
	function selectTab(groupIndex: number, tabIndex: number) {
		const tab = sluggifyTab(data.posTabGroups, groupIndex, tabIndex);
		goto(`${tab}`).then(() => {
			closeTabSelectModel();
		});
	}
</script>

{#if tabSelectModalOpen}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div
			class="bg-white rounded-xl shadow-lg w-fit max-w-[90vw] max-h-[90vh] overflow-y-auto p-6 relative"
		>
			<button
				class="absolute top-2 right-2 text-gray-500 hover:text-black"
				on:click={closeTabSelectModel}
			>
				✕
			</button>

			<h2 class="text-lg font-semibold mb-4">{t('pos.touch.selectTab')}</h2>

			{#each data.posTabGroups as tabGroup, groupIndex}
				<section class="mb-6">
					<h3 class="font-medium mb-2">{tabGroup.name}</h3>
					{#if tabGroup.tabs.length > 0}
						<div class="grid grid-cols-3 gap-2">
							{#each tabGroup.tabs as tab, tabIndex}
								<button
									class="touchScreen-product-cta text-white text-3xl min-h-[5rem] w-60 rounded-md py-2"
									style="background-color: {tab.color}"
									on:click={() => selectTab(groupIndex, tabIndex)}
								>
									{tab.label ?? `${tabGroup.name} ${tabIndex + 1}`}
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-gray-500">{t('pos.touch.noTabs')}</p>
					{/if}
				</section>
			{/each}

			<button
				class="mt-4 w-fit bg-gray-800 text-white text-2xl min-h-[3rem] py-2 px-4 rounded-md hover:bg-gray-900"
				on:click={closeTabSelectModel}
			>
				{t('pos.touch.cancel')}
			</button>
		</div>
	</div>
{/if}

<div class="flex flex-col h-screen justify-between min-h-min" inert={itemToEditIndex !== undefined}>
	<main class="mb-auto flex-grow overflow-y-auto">
		<div class="grid grid-cols-3 gap-4 h-full">
			<div class="touchScreen-ticket-menu p-3 h-full overflow-y-auto">
				{#if items.length}
					<h3 class="text-3xl">{t('pos.touch.ticketNumber')} tmp</h3>
					{#each items as item, i}
						<div class="flex flex-col py-3 gap-4">
							<form
								id="modify-item-{i}"
								method="post"
								bind:this={formNotes[i]}
								action="?/updateOrderTabItem"
							>
								<input type="hidden" name="note" />
								<input type="hidden" name="tabItemId" value={item.tabItemId} />
								<input type="hidden" name="tabSlug" value={tabSlug} />
								<input type="hidden" name="quantity" />
								<button
									type="button"
									class="text-start text-2xl w-full justify-between"
									on:click={() => openEditItemDialog(i)}
								>
									{item.quantity} X {item.product.name.toUpperCase()}<br />
									{item.internalNote?.value ? '+' + item.internalNote.value : ''}
									<div class="flex text-2xl flex-row items-end justify-end">
										{#if item.quantity > 1}{item.quantity}X
										{/if}
										<PriceTag
											amount={item.product.price.amount}
											currency={item.product.price.currency}
											class="text-2xl"
											main
										/>
									</div>
									{#if item.quantity > 1}
										<div class="text-2xl flex flex-row items-end justify-end">
											=<PriceTag
												amount={item.quantity * item.product.price.amount}
												currency={item.product.price.currency}
												class="text-2xl"
												main
											/>
										</div>
									{/if}
									<div class="text-2xl flex flex-row items-end justify-end">
										+<span class="font-semibold">{t('cart.vat')} {priceInfo.vatRates[i]}%</span>
									</div>
								</button><br />
							</form>
						</div>
					{/each}
					<div class="flex flex-col border-t border-gray-300 py-6">
						<h2 class="text-3xl">{t('cart.total').toUpperCase()} =</h2>
						<div class="flex flex-col items-end justify-end">
							<PriceTag
								amount={priceInfo.partialPriceWithVat}
								currency={priceInfo.currency}
								main
								class="text-2xl"
							/>
						</div>
						{#each priceInfo.vat as vat}
							<div class="flex flex-col">
								<h2 class="text-[28px]">{t('pos.touch.vatBreakdown')}</h2>
								<div class="text-2xl flex flex-row items-end justify-end">
									{vat.rate}% =
									<PriceTag
										amount={vat.partialPrice.amount}
										currency={vat.partialPrice.currency}
										main
										class="text-[28px]"
									/>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p>{t('cart.empty')}</p>
				{/if}
			</div>
			<div class="col-span-2 overflow-y-auto">
				<div class="grid grid-cols-2 gap-4 text-3xl text-center">
					<a
						class="col-span-2 touchScreen-category-cta"
						href={selfPageLink({ filter: 'pos-favorite', skip: 0 })}>{t('pos.touch.favorites')}</a
					>
					{#each data.tags as favoriteTag}
						<a
							class="touchScreen-category-cta"
							href={selfPageLink({ filter: favoriteTag._id, skip: 0 })}>{favoriteTag.name}</a
						>
					{/each}
					<a
						class="col-span-2 touchScreen-category-cta"
						href={selfPageLink({ filter: 'all', skip: 0 })}
					>
						{t('pos.touch.allProducts')}</a
					>

					<div class="col-span-2 grid grid-cols-2 gap-4">
						{#each displayedProducts as product}
							{#if !isPreorder(product.availableDate, product.preorder)}
								<ProductWidgetPOS
									{product}
									{tabSlug}
									pictures={picturesByProduct[product._id] ?? []}
								/>
							{/if}
						{/each}
						<div class="col-span-2 grid-cols-1 flex gap-2 justify-center">
							{#if next > 0}
								<a
									class="btn touchScreen-product-secondaryCTA text-3xl"
									on:click={() => (next = Math.max(0, next - posProductPagination))}
									href={selfPageLink({ filter, skip: Math.max(0, next) })}>&lt;</a
								>
							{/if}
							{t('pos.touch.pagination', { currentPage, totalPages })}
							{#if next + posProductPagination < productFiltered.length}
								<a
									class="btn touchScreen-product-secondaryCTA text-3xl"
									on:click={() => (next += posProductPagination)}
									href={selfPageLink({ filter, skip: next })}>&gt;</a
								>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
	<footer class="shrink-0">
		<div class="grid grid-cols-3 gap-4 mt-2">
			<button
				class="touchScreen-ticket-menu text-3xl p-4 text-center"
				on:click={() => (tabSelectModalOpen = true)}>{t('pos.touch.tickets')}</button
			>
			<div class="col-span-2 grid grid-cols-3 gap-4">
				<button
					class="col-span-1 touchScreen-action-secondaryCTA text-3xl p-4"
					on:click={() => alert(t('pos.touch.notDeveloped'))}>{t('pos.touch.save')}</button
				>
				<button
					class="col-span-1 touchScreen-action-secondaryCTA text-3xl p-4"
					on:click={() => alert(t('pos.touch.notDeveloped'))}>{t('pos.touch.pool')}</button
				>
				<button
					class="col-span-1 touchScreen-action-secondaryCTA text-3xl p-4"
					on:click={() => alert(t('pos.touch.notDeveloped'))}>{t('pos.touch.openDrawer')}</button
				>
			</div>
		</div>
		<div class="grid grid-cols-2 gap-4 mt-2">
			<a
				class="touchScreen-action-cta text-3xl p-4 text-center"
				href="/pos/touch/tab/{tabSlug}/split"
			>
				{t('pos.touch.pay')}
			</a>
			<form
				method="post"
				class="grid grid-cols-2 gap-4"
				use:enhance={(event) => {
					if (!confirm(warningMessage)) {
						event.cancel();
						return;
					}
					return async ({ result }) => {
						if (result.type === 'error') {
							alert(result.error?.message);
							return await applyAction(result);
						}
						await invalidate(UrlDependency.orderTab(tabSlug));
					};
				}}
			>
				<input type="hidden" name="tabSlug" value={tabSlug} />
				{#if items.length}
					<input type="hidden" name="tabItemId" value={items[items.length - 1].tabItemId} />
				{/if}
				<button
					class="col-span-1 touchScreen-action-cancel text-3xl p-4 text-center"
					disabled={!items.length}
					formaction="/pos?/removeFromTab"
					on:click={() => (warningMessage = t('pos.touch.confirmDeleteLastItem'))}>❎</button
				>
				<button
					class="col-span-1 touchScreen-action-delete text-3xl p-4 text-center"
					disabled={!items.length}
					formaction="/pos/?/removeTab"
					on:click={() => (warningMessage = t('pos.touch.confirmDeleteAllItems'))}>🗑️</button
				>
			</form>
		</div>
	</footer>
</div>

<!-- Item Edit Dialog -->
{#if itemToEditIndex !== undefined && itemToEditIndex >= 0}
	<ItemEditDialog item={items[itemToEditIndex]} onClose={concludeEditItem} />
{/if}
