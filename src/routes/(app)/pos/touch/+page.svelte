<script lang="ts">
	import type { SetRequired } from 'type-fest';
	import type { Picture } from '$lib/types/Picture';
	import ProductWidgetPOS from '$lib/components/ProductWidget/ProductWidgetPOS.svelte';
	import { POS_PRODUCT_PAGINATION, isPreorder } from '$lib/types/Product';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { invalidate } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import { UrlDependency } from '$lib/types/UrlDependency.js';
	import { groupBy } from '$lib/utils/group-by.js';
	import { onMount } from 'svelte';
	import ItemEditDialog from '$lib/components/ItemEditDialog.svelte';

	export let data;
	const tabSlug: string = data.tabSlug;
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
	$: priceInfo = data.priceInfo;
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
	$: lastItemId = items.length > 0 ? items[items.length - 1]?.product?._id : null;
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
</script>

<div class="flex flex-col h-screen justify-between" inert={itemToEditIndex !== undefined}>
	<main class="mb-auto flex-grow">
		<div class="grid grid-cols-3 gap-4 h-full">
			<div class="touchScreen-ticket-menu p-3 h-full">
				{#if items.length}
					<h3 class="text-3xl">TICKET n° tmp</h3>
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
								<h2 class="text-[28px]">Dont TVA</h2>
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
			<div class="col-span-2">
				<div class="grid grid-cols-2 gap-4 text-3xl text-center">
					<a
						class="col-span-2 touchScreen-category-cta"
						href={selfPageLink({ filter: 'pos-favorite', skip: 0 })}>FAVORIS</a
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
						>TOUS LES ARTICLES</a
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
							PAGE {currentPage}/{totalPages}
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
	<footer>
		<div class="grid grid-cols-3 gap-4 mt-2">
			<button
				class="touchScreen-ticket-menu text-3xl p-4 text-center"
				on:click={() => alert('Not developped yet')}>TICKETS</button
			>
			<div class="col-span-2 grid grid-cols-3 gap-4">
				<button
					class="col-span-1 touchScreen-action-secondaryCTA text-3xl p-4"
					on:click={() => alert('Not developped yet')}>SAUVER</button
				>
				<button
					class="col-span-1 touchScreen-action-secondaryCTA text-3xl p-4"
					on:click={() => alert('Not developped yet')}>POOL</button
				>
				<button
					class="col-span-1 touchScreen-action-secondaryCTA text-3xl p-4"
					on:click={() => alert('Not developped yet')}>OUVRIR TIROIR</button
				>
			</div>
		</div>
		<div class="grid grid-cols-2 gap-4 mt-2">
			<form
				class="touchScreen-action-cta text-3xl p-4 text-center"
				method="post"
				action="/pos?/checkoutTab"
			>
				<input type="hidden" name="tabSlug" value={tabSlug} />
				<button type="submit"> PAYER </button>
			</form>
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
						await invalidate(UrlDependency.Cart);
					};
				}}
			>
				<button
					class="col-span-1 touchScreen-action-cancel text-3xl p-4 text-center"
					disabled={!items.length}
					formaction="/cart/{lastItemId}/?/remove"
					on:click={() => (warningMessage = 'Do you want to delete the last cart line ?')}
					>❎</button
				>
				<button
					class="col-span-1 touchScreen-action-delete text-3xl p-4 text-center"
					disabled={!items.length}
					formaction="/cart/?/removeAll"
					on:click={() => (warningMessage = 'Do you want to delete all cart line ?')}>🗑️</button
				>
			</form>
		</div>
	</footer>
</div>

<!-- Item Edit Dialog -->
{#if itemToEditIndex !== undefined && itemToEditIndex >= 0}
	<ItemEditDialog item={items[itemToEditIndex]} onClose={concludeEditItem} />
{/if}
