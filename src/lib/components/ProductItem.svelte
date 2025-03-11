<script lang="ts">
	import type { Product } from '$lib/types/Product';
	import type { Picture } from '$lib/types/Picture';
	import PictureComponent from './Picture.svelte';
	import IconExternalNewWindowOpen from './icons/IconExternalNewWindowOpen.svelte';

	export let picture: Picture | undefined;
	export let product: Pick<Product, '_id' | 'name'>;
	export let isAdmin = false;
	let className = '';
	export { className as class };
</script>

<div class="flex flex-col text-center {className}">
	<a
		href="{isAdmin ? '/admin' : ''}/product/{product._id}"
		class="flex flex-col items-center relative"
	>
		<PictureComponent {picture} class="block h-36" />
		{#if isAdmin}
			<a target="_blank" href="/admin/product/{product._id}">
				<IconExternalNewWindowOpen
					class="absolute top-0 right-0 bg-white p-1 rounded-full shadow-md h-8 w-auto"
				/>
			</a>
		{/if}
		<span class="mt-2 line-clamp-3 text-ellipsis max-w-[192px] break-words hyphens-auto">
			{product.name}
		</span>
	</a>
	<slot />
</div>
