<script lang="ts">
	import type { Product } from '$lib/types/Product';
	import type { Picture } from '$lib/types/Picture';
	import PictureComponent from './Picture.svelte';
	import IconExternalNewWindowOpen from './icons/IconExternalNewWindowOpen.svelte';
	import { useI18n } from '$lib/i18n';

	export let picture: Picture | undefined;
	export let product: Pick<Product, '_id' | 'name'>;
	export let isAdmin = false;
	let className = '';
	export { className as class };

	const { t } = useI18n();

	$: href = `${isAdmin ? '/admin' : ''}/product/${product._id}`;
</script>

<div class="flex flex-col text-center {className}">
	<div class="flex flex-col items-center">
		{#if picture}
			<!-- Shrink-wrapped to the picture so the shop link sits on its corner whatever the name length. -->
			<div class="relative">
				<a {href}><PictureComponent {picture} class="block h-36" /></a>
				{#if isAdmin}
					<a
						target="_blank"
						href="/product/{product._id}"
						title={t('admin.product.openInShop')}
						aria-label={t('admin.product.openInShop')}
						class="absolute top-0 right-0"
					>
						<IconExternalNewWindowOpen
							class="body-secondaryCTA p-1 rounded-full shadow-md h-8 w-auto"
						/>
					</a>
				{/if}
			</div>
		{/if}
		<a
			{href}
			tabindex={picture ? -1 : undefined}
			class="mt-2 line-clamp-3 text-ellipsis max-w-[192px] break-words hyphens-auto"
		>
			{product.name}
		</a>
		{#if isAdmin && !picture}
			<a
				target="_blank"
				href="/product/{product._id}"
				title={t('admin.product.openInShop')}
				aria-label={t('admin.product.openInShop')}
				class="mt-1"
			>
				<IconExternalNewWindowOpen
					class="body-secondaryCTA p-1 rounded-full shadow-md h-8 w-auto"
				/>
			</a>
		{/if}
	</div>
	<slot />
</div>
