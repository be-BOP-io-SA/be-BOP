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
			invalidate(UrlDependency.orderTab(tabSlug));
		};
	}}
>
	<input type="hidden" name="tabSlug" value={tabSlug} />
	<input type="hidden" name="productId" value={product._id} />
	<button type="submit" disabled={!hasStock || loading}>
		<div class="touchScreen-product-cta flex flex-row {className} max-h-[4em]">
			<div>
				<PictureComponent
					picture={pictures[0]}
					class="object-contain h-24 w-24"
					style="object-fit: cover;"
				/>
			</div>
			<div class="p-3 flex items-start text-left">
				<h2 class="text-3xl break-all break-words">{product.name}</h2>
			</div>
		</div>
	</button>
</form>
