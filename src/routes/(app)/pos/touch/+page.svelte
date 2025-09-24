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
	$: items = data.cart.items;
	$: priceInfo = data.cart.priceInfo;
	const { t } = useI18n();
	let posProductPagination = POS_PRODUCT_PAGINATION;

	$: displayedProducts = productFiltered.slice(next, next + posProductPagination);
	$: totalPages = Math.ceil(productFiltered.length / posProductPagination);
	$: currentPage = Math.floor(next / posProductPagination) + 1;

	// Dialog state
	let showDialog = false;
	let selectedItemIndex = -1;

	function openItemDialog(event: Event, index: number) {
		event.preventDefault();
		selectedItemIndex = index;
		showDialog = true;
	}

	async function updateItemNote(note: string) {
		const index = selectedItemIndex;

		items[index].internalNote = { value: note, updatedAt: new Date() };

		const formData = new FormData(formNotes[index]);
		formData.set('note', note);

		try {
			const response = await fetch(formNotes[index].action, {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			if (result.type === 'error') {
				alert(result.error.message);
			} else {
				await invalidate(UrlDependency.Cart);
			}
		} catch (error) {
			console.error(error);
			alert('There was an error submitting the form.');
		}
	}

	async function updateItemQuantity(quantity: number) {
		const index = selectedItemIndex;
		const item = items[index];
		const currentQuantity = item.quantity;

		if (quantity === currentQuantity) {
			return;
		}

		// Update UI optimistically
		items[index].quantity = quantity;

		try {
			// Handle removal (quantity = 0)
			if (quantity === 0) {
				const formData = new FormData();
				if (item._id) {
					formData.set('lineId', item._id);
				}

				const response = await fetch(`/cart/${item.product._id}?/remove`, {
					method: 'POST',
					body: formData
				});

				const json = await response.json();
				if (json.type === 'error') {
					throw new Error(json.error.message);
				}
			} else if (quantity !== currentQuantity) {
				// Handle quantity change
				const formData = new FormData();
				formData.set('quantity', quantity.toString());
				if (item._id) {
					formData.set('lineId', item._id);
				}

				formData.set('mode', 'pos');

				const response = await fetch(`/cart/${item.product._id}?/setQuantity`, {
					method: 'POST',
					body: formData
				});

				const json = await response.json();
				if (json.type === 'error') {
					throw new Error(json.error.message);
				}
			}

			await invalidate(UrlDependency.Cart);
		} catch (error) {
			// Revert UI change on error
			items[index].quantity = currentQuantity;
			alert(error instanceof Error ? error.message : 'There was an error updating the quantity.');
		}
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
	onMount(() => {
		updatePaginationLimit();
		window.addEventListener('resize', updatePaginationLimit);

		return () => window.removeEventListener('resize', updatePaginationLimit);
	});
</script>

<div class="flex flex-col h-screen justify-between" inert={showDialog}>
	<main class="mb-auto flex-grow">
		<div class="grid grid-cols-3 gap-4 h-full">
			<div class="touchScreen-ticket-menu p-3 h-full">
				{#if items.length}
					<h3 class="text-3xl">TICKET n° tmp</h3>
					{#each items as item, i}
						<div class="flex flex-col py-3 gap-4">
							<form
								method="post"
								bind:this={formNotes[i]}
								action="/cart/{item.product._id}?/addNote"
							>
								<input type="hidden" name="note" />
								<button
									type="submit"
									class="text-start text-2xl w-full justify-between"
									on:click={(event) => openItemDialog(event, i)}
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
					<a class="col-span-2 touchScreen-category-cta" href="?filter=pos-favorite&skip=0"
						>FAVORIS</a
					>
					{#each data.tags as favoriteTag}
						<a class="touchScreen-category-cta" href="?filter={favoriteTag._id}&skip=0"
							>{favoriteTag.name}</a
						>
					{/each}
					<a class="col-span-2 touchScreen-category-cta" href="?filter=all&skip=0"
						>TOUS LES ARTICLES</a
					>

					<div class="col-span-2 grid grid-cols-2 gap-4">
						{#each displayedProducts as product}
							{#if !isPreorder(product.availableDate, product.preorder)}
								<ProductWidgetPOS {product} pictures={picturesByProduct[product._id] ?? []} />
							{/if}
						{/each}
						<div class="col-span-2 grid-cols-1 flex gap-2 justify-center">
							{#if next > 0}
								<a
									class="btn touchScreen-product-secondaryCTA text-3xl"
									on:click={() => (next = Math.max(0, next - posProductPagination))}
									href={`?filter=${filter}&skip=${Math.max(0, next)}`}>&lt;</a
								>
							{/if}
							PAGE {currentPage}/{totalPages}
							{#if next + posProductPagination < productFiltered.length}
								<a
									class="btn touchScreen-product-secondaryCTA text-3xl"
									on:click={() => (next += posProductPagination)}
									href={`?filter=${filter}&skip=${next}`}>&gt;</a
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
			<a class="touchScreen-action-cta text-3xl p-4 text-center" href="/checkout?display=headless"
				>PAYER</a
			>
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
{#if showDialog && selectedItemIndex >= 0}
	<ItemEditDialog
		item={items[selectedItemIndex]}
		onClose={() => (showDialog = false)}
		onUpdateNote={updateItemNote}
		onUpdateQuantity={updateItemQuantity}
	/>
{/if}
