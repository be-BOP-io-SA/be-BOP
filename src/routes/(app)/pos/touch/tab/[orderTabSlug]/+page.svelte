<script lang="ts">
	import type { SetRequired } from 'type-fest';
	import type { Picture } from '$lib/types/Picture';
	import ProductWidgetPOS from '$lib/components/ProductWidget/ProductWidgetPOS.svelte';
	import CategorySelect from '$lib/components/CategorySelect.svelte';
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
	import PrintTicketModal from '$lib/components/PrintTicketModal.svelte';
	import PrintableTicket from '$lib/components/PrintableTicket.svelte';
	import type { PrintTicketOptions } from '$lib/types/PrintTicketOptions';
	import type { PrintHistoryEntry } from '$lib/types/PrintHistoryEntry';
	import { z } from 'zod';

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
	$: items = data.orderTab.items.filter((item) => item.quantity > 0);
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
			form.requestSubmit();
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

	function handleCategorySelect(filterId: string) {
		goto(selfPageLink({ filter: filterId, skip: 0 }));
	}

	let printModalOpen = false;
	let ticketTagGroups: Array<{
		tagNames: string[];
		items: Array<{
			product: { name: string };
			quantity: number;
			variations: Array<{ text: string; count: number }>;
			notes: string[];
		}>;
	}> = [];
	let ticketGeneratedAt: Date | undefined = undefined;

	type TicketGroup = {
		product: (typeof items)[0]['product'];
		totalQuantity: number;
		variations: Array<{ text: string; count: number }>;
		notes: string[];
		itemIds: string[];
	};

	let availablePrintTags = data.printTags;
	$: availablePrintTags = data.printTags;

	$: hasNewItems = items.some((item) => item.quantity - (item.printedQuantity ?? 0) > 0);

	let poolLabel = 'n° tmp';
	$: {
		const tabs = data.posTabGroups.flatMap((group, g) =>
			group.tabs.map((tab, i) => ({
				slug: sluggifyTab(data.posTabGroups, g, i),
				label: tab.label ?? `${group.name} ${i + 1}`
			}))
		);
		poolLabel = tabs.find(({ slug }) => slug === tabSlug)?.label ?? 'n° tmp';
	}

	async function handlePrintTicket(options: PrintTicketOptions) {
		const filteredItems = items
			.map((item) => ({
				...item,
				newQuantity: item.quantity - (item.printedQuantity ?? 0)
			}))
			.filter((item) => {
				if (options.mode === 'newlyOrdered' && item.newQuantity <= 0) {
					return false;
				}
				if (options.tagFilter && !item.product.tagIds?.includes(options.tagFilter)) {
					return false;
				}
				return true;
			});

		type TagGroupKey = string;
		type ProductGroups = Map<string, TicketGroup>;

		const tagGroups = filteredItems.reduce((acc, item) => {
			const qtyToUse = options.mode === 'newlyOrdered' ? item.newQuantity : item.quantity;

			const printableTagIds = (item.product.tagIds ?? [])
				.filter((tagId) => data.printTagsMap[tagId])
				.slice()
				.sort();
			const tagKey = printableTagIds.join(',');

			if (!acc.has(tagKey)) {
				acc.set(tagKey, new Map<string, TicketGroup>());
			}
			const productGroups = acc.get(tagKey);
			if (!productGroups) {
				return acc;
			}

			const productKey = item.product._id;
			const existing = productGroups.get(productKey);

			if (!existing) {
				productGroups.set(productKey, {
					product: item.product,
					totalQuantity: qtyToUse,
					variations:
						item.chosenVariations && Object.keys(item.chosenVariations).length > 0
							? [{ text: Object.values(item.chosenVariations).join(' '), count: qtyToUse }]
							: [],
					notes: item.internalNote?.value ? [item.internalNote.value] : [],
					itemIds: [item.tabItemId]
				});
			} else {
				existing.totalQuantity += qtyToUse;
				existing.itemIds.push(item.tabItemId);

				if (item.chosenVariations && Object.keys(item.chosenVariations).length > 0) {
					const variationText = Object.values(item.chosenVariations).join(' ');
					const existingVariation = existing.variations.find((v) => v.text === variationText);
					if (existingVariation) {
						existingVariation.count += qtyToUse;
					} else {
						existing.variations.push({ text: variationText, count: qtyToUse });
					}
				}

				if (item.internalNote?.value) {
					existing.notes.push(item.internalNote.value);
				}
			}

			return acc;
		}, new Map<TagGroupKey, ProductGroups>());

		const uniqueTags = new Set<string>();
		let totalItemCount = 0;

		ticketTagGroups = Array.from(tagGroups.entries())
			.map(([tagKey, productGroups]) => {
				const tagIds = tagKey ? tagKey.split(',') : [];
				const tagNames = tagIds
					.map((id) => data.printTagsMap[id])
					.filter(Boolean)
					.sort();

				tagNames.forEach((tagName) => uniqueTags.add(tagName));

				const items = Array.from(productGroups.values()).map((group) => {
					totalItemCount += group.totalQuantity;
					return {
						product: { name: group.product.name },
						quantity: group.totalQuantity,
						variations: group.variations,
						notes: group.notes
					};
				});

				return {
					tagNames,
					items
				};
			})
			.sort((a, b) => {
				const aName = a.tagNames.join(', ');
				const bName = b.tagNames.join(', ');
				return aName.localeCompare(bName);
			});

		ticketGeneratedAt = new Date();

		setTimeout(() => {
			window.print();

			if (totalItemCount > 0 && ticketGeneratedAt) {
				const historyEntry: PrintHistoryEntry = {
					timestamp: ticketGeneratedAt,
					poolLabel,
					itemCount: totalItemCount,
					tagNames: Array.from(uniqueTags).sort(),
					tagGroups: ticketTagGroups
				};

				const historyFormData = new FormData();
				historyFormData.set('entry', JSON.stringify(historyEntry));

				fetch('?/savePrintHistory', {
					method: 'POST',
					body: historyFormData
				}).catch((error) => {
					console.error('Error saving print history:', error);
				});
			}

			if (options.mode === 'newlyOrdered' && filteredItems.length > 0) {
				const updates = filteredItems.map((item) => ({
					itemId: item.tabItemId,
					currentQuantity: item.quantity
				}));
				const formData = new FormData();
				formData.set('updates', JSON.stringify(updates));

				fetch('?/updatePrintStatus', {
					method: 'POST',
					body: formData
				}).catch((error) => {
					console.error('Error updating print status:', error);
				});
			}

			invalidate(UrlDependency.orderTab(tabSlug));
		}, 100);
	}

	function handleReprintFromHistory(entry: PrintHistoryEntry) {
		ticketTagGroups = entry.tagGroups;
		ticketGeneratedAt = new Date();

		setTimeout(() => {
			window.print();
		}, 100);
	}

	// Discount UI state
	let rightPanel: 'products' | 'discount' = 'products';
	let selectedPercentage = 0;
	let selectedTagId: string | null = null;
	let discountMotive = '';
	let showManualInput = false;
	let manualPercentage = '';
	let discountError = '';

	let peopleDropdownOpen = false;
	const peopleCountOptions = Array.from({ length: 21 }, (_, i) => i);

	$: isDiscountLocked = !!data.orderTab.processedPayments?.length;
	$: discountData =
		selectedPercentage > 0
			? JSON.stringify({
					percentage: selectedPercentage,
					...(selectedTagId && { tagId: selectedTagId }),
					...(discountMotive.trim() && { motive: discountMotive.trim() })
			  })
			: JSON.stringify(null);

	const PRESET_PERCENTAGES = [10, 20, 25, 50, 75];
	const percentageSchema = z.coerce.number().min(0).max(99);

	function openDiscountPanel() {
		rightPanel = 'discount';
		selectedPercentage = data.orderTab.discount?.percentage ?? 0;
		selectedTagId = data.orderTab.discount?.tagId ?? null;
		discountMotive = data.orderTab.discount?.motive ?? '';
		showManualInput = false;
		manualPercentage = '';
	}
</script>

{#if tabSelectModalOpen}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		role="button"
		tabindex="0"
		on:click={(e) => {
			if (e.target === e.currentTarget) {
				closeTabSelectModel();
			}
		}}
		on:keydown={(e) => e.key === 'Escape' && closeTabSelectModel()}
	>
		<div
			class="bg-white rounded-xl shadow-lg w-fit max-w-[90vw] max-h-[90vh] overflow-y-auto p-6 relative"
			role="dialog"
			aria-modal="true"
		>
			<button
				class="absolute top-2 right-2 bg-gray-800 text-white text-2xl min-h-[3rem] py-2 px-4 rounded-md hover:bg-gray-900"
				on:click={closeTabSelectModel}
			>
				{t('pos.touch.cancel')}
			</button>

			<h2 class="text-lg font-semibold mb-4">{t('pos.touch.selectTab')}</h2>

			{#each data.posTabGroups as tabGroup, groupIndex}
				<section class="mb-6">
					<h3 class="text-2xl font-semibold mb-3">{tabGroup.name}</h3>
					{#if tabGroup.tabs.length > 0}
						<div class="grid grid-cols-3 gap-2">
							{#each tabGroup.tabs as tab, tabIndex}
								{@const tabSlugComputed = sluggifyTab(data.posTabGroups, groupIndex, tabIndex)}
								{@const isActive = tabSlug === tabSlugComputed}
								{@const orderTab = data.allOrderTabs.find((t) => t.slug === tabSlugComputed)}
								{@const isEmpty = !orderTab || (orderTab.itemsCount ?? 0) === 0}
								{@const icon = isEmpty ? data.posPoolEmptyIcon : data.posPoolOccupiedIcon}
								<button
									class="touchScreen-product-cta text-3xl min-h-[5rem] w-60 rounded-md py-2"
									class:ring-4={isActive}
									class:ring-green-500={isActive}
									class:!text-green-300={isActive}
									class:!text-white={!isActive}
									style="background-color: {tab.color}"
									on:click={() => selectTab(groupIndex, tabIndex)}
								>
									{tab.label ?? `${tabGroup.name} ${tabIndex + 1}`} <span class="ml-2">{icon}</span>
								</button>
							{/each}
						</div>
					{:else}
						<p class="text-gray-500">{t('pos.touch.noTabs')}</p>
					{/if}
				</section>
			{/each}
		</div>
	</div>
{/if}

<div class="flex flex-col h-screen justify-between min-h-min" inert={itemToEditIndex !== undefined}>
	<main class="mb-auto flex-grow overflow-y-auto">
		<div class="grid {rightPanel === 'discount' ? 'grid-cols-2' : 'grid-cols-3'} gap-4 h-full">
			<div class="touchScreen-ticket-menu p-3 h-full overflow-y-auto flex flex-col">
				{#if items.length}
					<h3 class="text-3xl">{poolLabel}</h3>
					{#each items as item, i}
						<div class="flex flex-col py-3 gap-4">
							<form
								id="modify-item-{i}"
								method="post"
								bind:this={formNotes[i]}
								action="?/updateOrderTabItem"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'error') {
											return await applyAction(result);
										}
										await invalidate(UrlDependency.orderTab(tabSlug));
									};
								}}
							>
								<input type="hidden" name="note" />
								<input type="hidden" name="tabItemId" value={item.tabItemId} />
								<input type="hidden" name="tabSlug" value={tabSlug} />
								<input type="hidden" name="quantity" />
								<button
									type="button"
									class="text-start text-2xl w-full"
									on:click={() => openEditItemDialog(i)}
								>
									<div class="mb-1">{item.quantity} x {item.product.name.toUpperCase()}</div>
									{#if item.internalNote?.value}
										<div class="text-lg mb-1">+{item.internalNote.value}</div>
									{/if}
									<div
										class="grid grid-cols-[1fr_1fr_1fr] lg:grid-cols-[minmax(auto,25px)_1fr_1fr_1fr] gap-x-2 text-sm sm:text-base md:text-lg lg:text-xl"
									>
										<span class="hidden lg:block">{t('pos.touch.exclVat')}</span>
										<PriceTag
											amount={priceInfo.perItem[i].amount}
											currency={priceInfo.perItem[i].currency}
											class="text-sm sm:text-base md:text-lg lg:text-xl text-right"
											main
										/>
										<span class="whitespace-nowrap"
											>{t('pos.touch.inclVat')} {priceInfo.vatRates[i]}%</span
										>
										<PriceTag
											amount={priceInfo.perItem[i].amount * (1 + priceInfo.vatRates[i] / 100)}
											currency={priceInfo.perItem[i].currency}
											class="text-sm sm:text-base md:text-lg lg:text-xl text-right"
											main
										/>
									</div>
								</button><br />
							</form>
						</div>
					{/each}
					<div class="flex flex-col border-t border-gray-300 py-4 mt-auto">
						<h2 class="text-xl sm:text-2xl md:text-3xl underline mb-1">{t('pos.touch.total')}</h2>
						<div
							class="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-0 text-base sm:text-lg md:text-xl lg:text-2xl"
						>
							<span class="whitespace-nowrap">{t('pos.touch.exclVat')}</span>
							<PriceTag
								amount={priceInfo.partialPrice}
								currency={priceInfo.currency}
								main
								class="text-base sm:text-lg md:text-xl lg:text-2xl text-right"
							/>
							<span class="whitespace-nowrap">{t('pos.touch.inclVat')}</span>
							<PriceTag
								amount={priceInfo.partialPriceWithVat}
								currency={priceInfo.currency}
								main
								class="text-base sm:text-lg md:text-xl lg:text-2xl text-right"
							/>
							{#each priceInfo.vat as vat}
								<span class="whitespace-nowrap">{t('pos.touch.vatBreakdown')} {vat.rate}%</span>
								<PriceTag
									amount={vat.partialPrice.amount}
									currency={vat.partialPrice.currency}
									main
									class="text-base sm:text-lg md:text-xl lg:text-2xl text-right"
								/>
							{/each}
						</div>
					</div>
				{:else}
					<p>{t('cart.empty')}</p>
				{/if}
			</div>
			<div class="{rightPanel === 'discount' ? '' : 'col-span-2'} overflow-y-auto">
				{#if rightPanel === 'products'}
					<div class="grid grid-cols-2 gap-4 text-3xl text-center">
						{#if data.posUseSelectForTags}
							<!-- Select menu mode -->
							<div class="col-span-2">
								<CategorySelect
									tags={data.posTouchScreenTags}
									currentFilter={filter}
									onSelect={handleCategorySelect}
								/>
							</div>
						{:else}
							<!-- Button mode (current) -->
							<a
								class="col-span-2 touchScreen-category-cta"
								href={selfPageLink({ filter: 'pos-favorite', skip: 0 })}
								>{t('pos.touch.favorites')}</a
							>
							{#each data.posTouchScreenTags as favoriteTag}
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
						{/if}

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
				{:else if rightPanel === 'discount'}
					<!-- Discount UI -->
					<div class="flex flex-col h-full gap-4 p-4 overflow-y-auto bg-yellow-50">
						<h2 class="text-4xl font-semibold mb-2">{t('pos.discount.title')}</h2>

						<!-- Percentage buttons grid -->
						<div class="grid grid-cols-3 gap-3">
							<button
								class="col-span-3 text-2xl font-bold p-4 rounded {selectedPercentage === 0 &&
								!showManualInput
									? 'bg-blue-800'
									: 'bg-yellow-800'} text-white"
								disabled={isDiscountLocked}
								on:click={() => {
									selectedPercentage = 0;
									showManualInput = false;
								}}
							>
								{t('pos.discount.noDiscount')}
							</button>

							{#each PRESET_PERCENTAGES as percentage}
								<button
									class="text-2xl font-bold p-4 rounded {selectedPercentage === percentage &&
									!showManualInput
										? 'bg-blue-800'
										: 'bg-yellow-800'} text-white"
									disabled={isDiscountLocked}
									on:click={() => {
										selectedPercentage = percentage;
										showManualInput = false;
									}}
								>
									{percentage}%
								</button>
							{/each}

							<button
								class="col-span-3 text-2xl font-bold p-4 rounded {showManualInput
									? 'bg-blue-800'
									: 'bg-yellow-800'} text-white"
								disabled={isDiscountLocked}
								on:click={() => {
									showManualInput = true;
									manualPercentage =
										selectedPercentage > 0 && !PRESET_PERCENTAGES.includes(selectedPercentage)
											? selectedPercentage.toString()
											: '';
								}}
							>
								{t('pos.discount.manualPercent')}
							</button>
						</div>

						<!-- Manual percentage input -->
						{#if showManualInput}
							<div class="flex gap-2">
								<input
									type="number"
									min="0"
									max="100"
									step="0.1"
									bind:value={manualPercentage}
									on:input={() => {
										const result = percentageSchema.safeParse(manualPercentage);
										if (result.success) {
											selectedPercentage = result.data;
										}
									}}
									placeholder={t('pos.discount.manualPercentPlaceholder')}
									class="flex-1 text-3xl p-3 border-2 border-gray-300 rounded"
									disabled={isDiscountLocked}
								/>
							</div>
						{/if}

						<!-- Tag filters -->
						<h3 class="text-2xl font-semibold mt-4 mb-2">{t('pos.discount.applyToTag')}</h3>
						<div class="grid grid-cols-3 gap-3">
							{#each data.printTags as tag}
								<button
									class="text-2xl font-bold p-4 rounded {selectedTagId === tag._id
										? 'bg-blue-800'
										: 'bg-yellow-800'} text-white"
									disabled={isDiscountLocked}
									on:click={() => (selectedTagId = tag._id)}
								>
									{tag.name}
								</button>
							{/each}

							<button
								class="col-span-3 text-2xl font-bold p-4 rounded {selectedTagId === null
									? 'bg-blue-800'
									: 'bg-yellow-800'} text-white"
								disabled={isDiscountLocked}
								on:click={() => (selectedTagId = null)}
							>
								{t('pos.discount.allProducts')}
							</button>
						</div>

						<!-- Current discount display -->
						<div class="bg-white border-2 border-gray-300 p-4 rounded mt-4">
							<p class="text-xl mb-2">
								<strong>{t('pos.discount.currentDiscount')}</strong>
								{#if data.orderTab.discount && data.orderTab.discount.percentage > 0}
									{data.orderTab.discount.percentage}%
									{#if data.orderTab.discount.tagId}
										- {data.printTags.find((t) => t._id === data.orderTab.discount?.tagId)?.name ??
											'Unknown tag'}
									{:else}
										- {t('pos.discount.allProducts')}
									{/if}
								{:else}
									{t('pos.discount.none')}
								{/if}
							</p>
							<p class="text-xl">
								<strong>{t('pos.discount.motiveLabelOptional')}</strong>
								{data.orderTab.discount?.motive ?? t('pos.discount.none')}
							</p>
						</div>

						<!-- Motive input (optional) -->
						<div>
							<label for="motive" class="block text-2xl font-semibold mb-2"
								>{t('pos.discount.motiveLabelOptional')}</label
							>
							<input
								id="motive"
								type="text"
								bind:value={discountMotive}
								placeholder={t('pos.discount.motivePlaceholder')}
								class="w-full text-2xl p-3 border-2 border-gray-300 rounded"
								disabled={isDiscountLocked}
							/>
						</div>

						{#if discountError}
							<div class="bg-red-100 border-2 border-red-400 p-4 rounded">
								<p class="text-red-600 text-xl text-center">
									{discountError}
								</p>
							</div>
						{/if}

						{#if isDiscountLocked}
							<div class="bg-red-100 border-2 border-red-400 p-4 rounded">
								<p class="text-red-600 text-xl text-center">
									{t('pos.discount.lockedWarning')}
								</p>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</main>
	<footer class="shrink-0">
		<div class="grid {rightPanel === 'discount' ? 'grid-cols-2' : 'grid-cols-3'} gap-4 mt-2">
			{#if rightPanel === 'products'}
				<button
					class="touchScreen-ticket-menu text-3xl p-4 text-center"
					on:click={() => (tabSelectModalOpen = true)}>POOL</button
				>
				<div class="col-span-2 grid gap-4" style="grid-template-columns: 1fr 1fr 200px;">
					<button
						class="touchScreen-action-secondaryCTA text-3xl p-4"
						disabled={!items.length}
						on:click={() => (printModalOpen = true)}>PRINT TICKETS</button
					>
					<button
						class="touchScreen-action-secondaryCTA text-3xl p-4 uppercase"
						disabled={!items.length}
						on:click={openDiscountPanel}>{t('pos.discount.title')}</button
					>
					<div class="flex items-center gap-2 bg-gray-200 rounded p-2 h-full relative">
						<span class="text-3xl pl-1">👨‍👩‍👧‍👦</span>
						<button
							type="button"
							class="flex-1 text-2xl text-center p-2 border-0 rounded bg-white hover:bg-gray-50 flex items-center justify-center gap-2"
							on:click={() => (peopleDropdownOpen = !peopleDropdownOpen)}
						>
							<span>{data.orderTab.peopleCountFromPosUi ?? 0}</span>
							<span class="text-sm opacity-70">{peopleDropdownOpen ? '▲' : '▼'}</span>
						</button>
						{#if peopleDropdownOpen}
							<div
								class="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-gray-400 rounded shadow-xl overflow-hidden z-50"
								style="max-height: min(80vh, 500px);"
							>
								<div class="overflow-y-auto" style="max-height: min(80vh, 500px);">
									<form
										method="POST"
										action="?/updatePeopleCount"
										use:enhance={() => {
											return async ({ result }) => {
												if (result.type === 'error') {
													return await applyAction(result);
												}
												await invalidate(UrlDependency.orderTab(tabSlug));
												peopleDropdownOpen = false;
											};
										}}
									>
										<input type="hidden" name="peopleCount" value="" />
										{#each peopleCountOptions as count}
											<button
												type="submit"
												class="w-full text-2xl py-3 px-4 hover:bg-blue-100 text-center border-b border-gray-200 last:border-b-0"
												on:click={(e) => {
													const form = e.currentTarget.closest('form');
													const input = form?.querySelector('input[name="peopleCount"]');
													if (input instanceof HTMLInputElement) {
														input.value = count.toString();
													}
												}}
											>
												{count}
											</button>
										{/each}
									</form>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{:else if rightPanel === 'discount'}
				<button
					class="touchScreen-action-cancel uppercase text-3xl text-white p-4 text-center"
					on:click={() => (rightPanel = 'products')}
				>
					{t('pos.split.return')}
				</button>

				<form
					method="POST"
					action="?/updateDiscount"
					use:enhance={() => {
						discountError = '';
						return async ({ result }) => {
							if (result.type === 'error') {
								discountError = result.error?.message || 'Failed to save discount';
								return;
							}
							if (result.type === 'failure') {
								discountError =
									(result.data && typeof result.data === 'object' && 'message' in result.data
										? String(result.data.message)
										: null) || 'Failed to save discount';
								return;
							}
							await invalidate(UrlDependency.orderTab(tabSlug));
							rightPanel = 'products';
						};
					}}
				>
					<input type="hidden" name="discount" value={discountData} />
					<button
						type="submit"
						class="bg-green-800 hover:bg-green-900 uppercase text-3xl text-white p-4 text-center w-full"
						disabled={isDiscountLocked}
					>
						{t('pos.discount.save')}
					</button>
				</form>
			{/if}
		</div>
		{#if rightPanel === 'products'}
			<div class="grid grid-cols-3 gap-4 mt-2">
				<a
					class="touchScreen-action-cta text-3xl p-4 text-center"
					href="/pos/touch/tab/{tabSlug}/split"
				>
					{t('pos.touch.pay')}
				</a>
				<form
					method="post"
					class="col-span-2 grid grid-cols-2 gap-4"
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
		{/if}
	</footer>
</div>

<!-- Print Ticket Modal -->
<PrintTicketModal
	bind:isOpen={printModalOpen}
	availableTags={availablePrintTags}
	{hasNewItems}
	printHistory={data.orderTab.printHistory ?? []}
	onConfirm={handlePrintTicket}
	onCancel={() => (printModalOpen = false)}
	onReprintFromHistory={handleReprintFromHistory}
/>

<!-- Printable Ticket (hidden on screen, visible on print) -->
<PrintableTicket {poolLabel} tagGroups={ticketTagGroups} generatedAt={ticketGeneratedAt} />

<!-- Item Edit Dialog -->
{#if itemToEditIndex !== undefined && itemToEditIndex >= 0}
	<ItemEditDialog item={items[itemToEditIndex]} onClose={concludeEditItem} />
{/if}
