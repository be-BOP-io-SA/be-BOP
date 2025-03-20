<script lang="ts">
	import { groupBy } from 'lodash-es';
	import type { SetRequired } from 'type-fest';
	import type { Picture } from '$lib/types/Picture';
	import ProductWidgetPOS from '$lib/components/ProductWidget/ProductWidgetPOS.svelte';
	import { POS_PRODUCT_PAGINATION, isPreorder } from '$lib/types/Product';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n.js';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { computeDeliveryFees, computePriceInfo } from '$lib/types/Cart.js';
	import { UNDERLYING_CURRENCY } from '$lib/types/Currency.js';
	import { isAlpha2CountryCode } from '$lib/types/Country.js';
	import { invalidate } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import { UrlDependency } from '$lib/types/UrlDependency.js';

	export let data;
	$: next = Number($page.url.searchParams.get('skip')) || 0;
	$: picturesByProduct = groupBy(
		data.pictures.filter(
			(picture): picture is SetRequired<Picture, 'productId'> => !!picture.productId
		),
		'productId'
	);
	$: filter = $page.url.searchParams.get('filter') ?? 'pos-favorite';
	$: productFiltered =
		filter === 'all'
			? data.products
			: data.products.filter((product) => product.tagIds?.includes(filter));
	$: items = data.cart || [];
	$: deliveryFees =
		data.countryCode && isAlpha2CountryCode(data.countryCode)
			? computeDeliveryFees(UNDERLYING_CURRENCY, data.countryCode, items, data.deliveryFees)
			: NaN;
	$: priceInfo = computePriceInfo(items, {
		bebopCountry: data.vatCountry,
		vatSingleCountry: data.vatSingleCountry,
		vatNullOutsideSellerCountry: data.vatNullOutsideSellerCountry,
		vatExempted: data.vatExempted,
		userCountry: data.countryCode,
		deliveryFees: {
			amount: deliveryFees || 0,
			currency: UNDERLYING_CURRENCY
		},
		vatProfiles: data.vatProfiles
	});
	const { t } = useI18n();
	$: displayedProducts = productFiltered.slice(next, next + POS_PRODUCT_PAGINATION);
	$: totalPages = Math.ceil(productFiltered.length / POS_PRODUCT_PAGINATION);
	$: currentPage = Math.floor(next / POS_PRODUCT_PAGINATION) + 1;

	async function addNoteToItem(event: Event, index: number, defaultPrompt: string) {
		event.preventDefault();
		const notePrompt = prompt('enter a comment:', defaultPrompt);
		if (notePrompt) {
			items[index].internalNote = { value: notePrompt, updatedAt: new Date() };
			items = [...items];
			const formData = new FormData(formNotes[index]);
			formData.set('note', notePrompt);
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
				alert('There was an error submitting the form.');
			}
		}
	}
	let formNotes: HTMLFormElement[] = [];
	$: lastItemId = items.length > 0 ? items[items.length - 1]?.product?._id : null;
	let warningMessage = '';
</script>

<div class="flex flex-col h-screen justify-between">
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
								action="/cart/{item.product._id}/?/addNote"
							>
								<input type="hidden" name="note" />
								<button
									type="submit"
									class="text-start text-2xl w-full justify-between"
									on:click={(event) => addNoteToItem(event, i, item.internalNote?.value || '')}
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
								<ProductWidgetPOS {product} pictures={picturesByProduct[product._id]} />
							{/if}
						{/each}
						<div class="col-span-2 grid-cols-1 flex gap-2 justify-center">
							{#if next > 0}
								<a
									class="btn touchScreen-product-secondaryCTA text-3xl"
									on:click={() => (next = Math.max(0, next - POS_PRODUCT_PAGINATION))}
									href={`?filter=${filter}&skip=${Math.max(0, next)}`}>&lt;</a
								>
							{/if}
							PAGE {currentPage}/{totalPages}
							{#if next + POS_PRODUCT_PAGINATION < productFiltered.length}
								<a
									class="btn touchScreen-product-secondaryCTA text-3xl"
									on:click={() => (next += POS_PRODUCT_PAGINATION)}
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
