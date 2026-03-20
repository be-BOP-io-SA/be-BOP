<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { Product } from '$lib/types/Product';
	import PictureComponent from '../Picture.svelte';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { UrlDependency } from '$lib/types/UrlDependency';
	import { useI18n } from '$lib/i18n';

	export let pictures: Picture[] | [];
	export let product: Pick<Product, 'name' | '_id' | 'price' | 'stock'>;
	export let tabSlug: string;
	export let priceWithVat = 0;
	export let currency = product.price.currency;
	export let quantityInCart = 0;
	export let isMobile = false;
	let loading = false;
	let className = '';
	export { className as class };
	let hasStock = !!(product.stock?.available ?? Infinity);

	const { t } = useI18n();
</script>

<form
	method="post"
	class="contents"
	action="/pos?/addToTab"
	use:enhance={() => {
		loading = true;
		return ({ result }) => {
			loading = false;
			if (result.type === 'error') {
				alert(result.error.message);
				return;
			}
			if (result.type === 'failure' && result.data?.error === 'maxQuantityReached') {
				alert(t('pos.touch.maxQuantityReached', { max: Number(result.data.maxQuantity) }));
				return;
			}
			if (result.type === 'failure' && result.data?.error === 'sharesPaymentStarted') {
				alert(t('pos.split.completeSharesFirst'));
				return;
			}
			invalidate(UrlDependency.orderTab(tabSlug));
		};
	}}
>
	<input type="hidden" name="tabSlug" value={tabSlug} />
	<input type="hidden" name="productId" value={product._id} />
	<button type="submit" disabled={!hasStock || loading}>
		<div class="touchScreen-product-cta flex flex-col {className}">
			<div class="relative {isMobile ? '' : 'flex flex-row'}">
				<div class={isMobile ? 'w-full h-24 overflow-hidden' : 'shrink-0 w-24 h-24'}>
					<PictureComponent picture={pictures[0]} class="w-full h-full object-cover" />
				</div>
				<div
					class={isMobile
						? 'absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2'
						: 'static bg-none bg-transparent h-auto p-3 pt-0 pl-1 items-start text-left flex-1 min-w-0'}
				>
					<h2
						class="line-clamp-2 break-words text-center w-full {isMobile
							? 'font-bold text-white'
							: 'font-normal'}"
					>
						{product.name}
					</h2>
				</div>
			</div>
			<div class="flex justify-between items-center px-2 py-0.5 bg-black/40 text-base">
				<span class="font-semibold text-white">{priceWithVat.toFixed(2)} {currency}</span>
				<span class="font-bold text-white">x {quantityInCart}</span>
			</div>
		</div>
	</button>
</form>
