<script lang="ts">
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import IconHome from '$lib/components/icons/IconHome.svelte';
	import IconGrid from '$lib/components/icons/IconGrid.svelte';
	import { useI18n } from '$lib/i18n';
	import PictureComponent from '$lib/components/Picture.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ctiAddToCartState } from '$lib/stores/ctiAddToCart';
	import { onDestroy } from 'svelte';

	export let data;
	const { t } = useI18n();
	$: priceInfo = data.cart.priceInfo;

	let successTimeout: ReturnType<typeof setTimeout> | null = null;

	$: if ($ctiAddToCartState === 'success') {
		if (successTimeout) clearTimeout(successTimeout);
		successTimeout = setTimeout(() => {
			ctiAddToCartState.set('idle');
		}, 5000);
	}

	onDestroy(() => {
		if (successTimeout) clearTimeout(successTimeout);
	});
</script>

<div class="mx-auto max-w-7xl px-2">
	<button
		class="self-start text-gray-800 font-semibold text-lg flex items-center mb-4"
		on:click={() => history.back()}
	>
		<IconBack />
		{t('customerTouch.ctaBack')}
	</button>

	<div class="grid grid-cols-[min-content_auto] gap-2">
		<aside class="bg-[#2f2f32] text-white flex flex-col rounded-lg pt-2">
			<nav class="flex-1">
				<a
					href="/pos/customer-touch/list/home"
					class="flex flex-col items-center px-4 py-3 text-lg font-semibold hover:bg-gray-700"
				>
					<div
						class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mb-1"
					>
						<IconHome />
					</div>
					{t('customerTouch.nav.home')}
				</a>
				<a
					href="/pos/customer-touch/list/all"
					class="flex flex-col items-center px-4 py-3 text-lg font-semibold hover:bg-gray-700"
				>
					<div
						class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mb-1"
					>
						<IconGrid />
					</div>
					{t('customerTouch.nav.allProducts')}
				</a>
				{#if data.cti.categories}
					{#each data.cti.categories.filter((c) => !c.isArchived && (c.tagId || c.isCmsOnly)) as category}
						<a
							href="/pos/customer-touch/list/{category.isCmsOnly ? `cms/${category.slug}` : category.tagId}"
							class="flex flex-col items-center px-2 py-1 text-lg font-medium hover:bg-gray-700 transition-colors duration-200"
						>
							<div
								class="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center mb-1"
							>
								<PictureComponent
									picture={data.pictures.filter(
										(pic) => pic.ctiCategorySlug && pic.ctiCategorySlug === category.slug
									)[0]}
									class="h-11 w-11 object-cover rounded-full"
								/>
							</div>
							{category.label}
						</a>
					{/each}
				{/if}
			</nav>
		</aside>
		<slot />
		{#if $page.url.pathname !== '/pos/customer-touch/list/drop'}
			<button
				on:click={() => goto('/pos/customer-touch/list/drop')}
				class="bg-[#2f2f32] text-white flex justify-center text-xl font-semibold rounded-lg p-4 mb-8"
			>
				{t('customerTouch.cta.abandonment')}
			</button>
			{#if $page.url.pathname.startsWith('/pos/customer-touch/list/product/')}
				<div class="flex gap-2 mb-8">
					<button
						class="bg-blue-500 text-white flex-1 flex justify-center text-xl rounded-lg font-semibold p-4"
						on:click={() => goto('/pos/customer-touch/list/cart')}
					>
						{t('customerTouch.cta.viewCart')}
					</button>
					<button
						class="bg-[#8fd16a] text-black flex-1 flex justify-center items-center text-xl rounded-lg font-semibold p-4 {$ctiAddToCartState !== 'idle' ? 'opacity-70' : ''}"
						disabled={$ctiAddToCartState !== 'idle'}
						on:click={() => {
							const form = document.getElementById('product-add-form');
							if (form) form.requestSubmit();
						}}
					>
						{#if $ctiAddToCartState === 'success'}
							<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
							</svg>
						{:else}
							{t('customerTouch.cta.addProduct')}
						{/if}
					</button>
				</div>
			{:else if $page.url.pathname === '/pos/customer-touch/list/cart'}
				<button
					class="bg-[#8fd16a] text-black flex justify-center text-xl rounded-lg font-semibold p-4 mb-8"
					disabled={!data.cart.items?.length}
					on:click={() => goto('/pos/customer-touch/payment')}
				>
					{t('customerTouch.cta.pay')}
				</button>
			{:else if !data.cart.items?.length}
				<button
					class="bg-[#8fd16a] text-black flex justify-center text-xl rounded-lg font-semibold p-4 mb-8"
					disabled
					on:click={() => goto('/pos/customer-touch/list/cart')}
				>
					{t('customerTouch.cta.addFirstProduct')}
				</button>
			{:else}
				<button
					class="bg-[#8fd16a] text-black flex justify-center text-xl rounded-lg font-semibold p-4 mb-8"
					on:click={() => goto('/pos/customer-touch/list/cart')}
				>
					<PriceTag
						amount={priceInfo.totalPriceWithVat}
						currency={priceInfo.currency}
						main
					/>&nbsp;/ {t('customerTouch.cta.end')}
				</button>
			{/if}
		{/if}
	</div>
</div>
