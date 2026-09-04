<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import Picture from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { useI18n } from '$lib/i18n.js';
	import { DEFAULT_MAX_QUANTITY_PER_ORDER } from '$lib/types/Product.js';
	import { UrlDependency } from '$lib/types/UrlDependency.js';

	export let data;
	const { t } = useI18n();

	$: items = data.cart.items || [];
	$: priceInfo = data.cart.priceInfo;
</script>

<main class="flex flex-col bg-gray-100 border rounded-lg">
	<div class="p-2">
		<div class="mb-6">
			<h2 class="text-3xl font-bold text-gray-900 mb-1">{t('customerTouch.cart.title')}</h2>
			<p class="text-lg font-semibold text-gray-700 uppercase">
				{data.cartTarget === 'onsite'
					? t('customerTouch.cart.targetOnSite')
					: t('customerTouch.cart.targetTakeAway')}
			</p>
		</div>

		<div class="flex flex-col gap-4">
			{#each items as item, i}
				{@const price = priceInfo.perItem[i]}
				{@const toDepositFactor = (item.depositPercentage ?? 100) / 100}
				<form
					class="grid grid-cols-[min-content_auto] gap-2"
					method="post"
					use:enhance={({ action }) => {
						if (action.searchParams.has('/increase')) {
							item.quantity++;
						} else if (action.searchParams.has('/decrease')) {
							item.quantity--;
						}

						return async ({ result }) => {
							if (result.type === 'error' && result.error?.message) {
								await invalidate(UrlDependency.Cart);
								return;
							}
							await applyAction(result);
						};
					}}
				>
					<div class="w-16 h-16 rounded-lg">
						{#if item.picture}
							<Picture
								picture={item.picture}
								class="w-16 h-16 object-cover-full rounded-lg shadow-md"
							/>
						{/if}
					</div>
					<div class="flex flex-col w-full">
						<div>
							<p>
								{item.chosenVariations
									? item.product.name +
									  ' - ' +
									  Object.entries(item.chosenVariations)
											.map(([key, value]) => item.product.variationLabels?.values[key][value])
											.join(' - ')
									: item.product.name}
							</p>
							<p class="font-semibold">
								<PriceTag
									amount={price.amountWithoutDiscount * toDepositFactor}
									currency={price.currency}
									main
								/>
							</p>
						</div>
						<input type="hidden" name="quantity" value={item.quantity} />
						<input type="hidden" name="lineId" value={item._id} />
						{#if !item.product.variationLabels && !item.product.standalone}
							<div class="flex items-end justify-end gap-1">
								<button
									formaction="/cart/{item.product._id}/?/decrease"
									disabled={item.quantity <= 0}
									class="w-8 h-8 border border-black flex items-center justify-center rounded-lg text-xl font-semibold"
								>
									-
								</button>
								<span class="w-8 h-8 text-center text-xl text-gray-900 font-semibold"
									>{item.quantity}</span
								>
								<button
									formaction="/cart/{item.product._id}/?/increase"
									disabled={item.quantity >=
										(item.product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER) ||
										(item.product.stock && item.product.stock.available <= 0)}
									class="w-8 h-8 flex items-center justify-center bg-[#8fd16a] rounded-lg text-xl"
								>
									+
								</button>
							</div>
						{/if}
					</div>
				</form>
			{/each}
		</div>

		<hr class="border-gray-200 my-8" />

		<div class="text-gray-900">
			<div class="flex flex-row text-xl font-bold mb-1">
				<PriceTag amount={priceInfo.partialPrice} currency={priceInfo.currency} main />&nbsp;{t(
					'customerTouch.cart.ht'
				)}
			</div>
			{#each priceInfo.vat as vat}
				<div class="flex flex-row text-base text-gray-700 mb-6">
					{t('cart.vat')} ({vat.rate}%) &nbsp;<PriceTag
						amount={vat.partialPrice.amount}
						currency={vat.partialPrice.currency}
						main
					/>
				</div>
			{/each}
			<p class="text-xl font-bold">{t('customer-touch.cart.totalTTC')}:</p>
			<p class="text-4xl font-bold">
				<PriceTag amount={priceInfo.partialPriceWithVat} currency={priceInfo.currency} main />
			</p>
		</div>
	</div>
</main>
