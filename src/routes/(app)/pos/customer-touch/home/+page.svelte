<script lang="ts">
	import IconBack from '$lib/components/icons/IconBack.svelte';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import IconMenu from '~icons/ant-design/menu-outlined';
	import PictureComponent from '$lib/components/Picture.svelte';
	import { useI18n } from '$lib/i18n';
	import IconBurger from '$lib/components/icons/IconBurger.svelte';
	import IconSalad from '$lib/components/icons/IconSalad.svelte';
	import IconDrink from '$lib/components/icons/IconDrink.svelte';
	import IconDessert from '$lib/components/icons/IconDessert.svelte';
	import PriceTag from '$lib/components/PriceTag.svelte';
	export let data;
	const { t } = useI18n();
	$: picturesByProduct = Object.fromEntries(
		[...data.pictures].reverse().map((picture) => [picture.productId, picture])
	);
</script>

<div class="mx-auto max-w-7xl px-2">
	<button
		class="self-start text-gray-800 font-semibold text-lg flex items-center"
		on:click={() => history.back()}
	>
		<IconBack />
		{t('customerTouch.ctaBack')}
	</button>

	<div class="grid grid-cols-[min-content_auto] gap-2">
		<aside class="bg-sidebar-dark text-white flex flex-col pt-2">
			<nav class="flex-1">
				<a
					href="/pos/customer-touch/home"
					class="flex flex-col items-center px-4 py-3 text-lg font-semibold hover:bg-gray-700"
				>
					<div
						class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mb-1"
					>
						<IconSearch />
					</div>
					Recherche
				</a>

				<a
					href="/pos/customer-touch/home"
					class="flex flex-col items-center px-4 py-3 text-lg font-medium hover:bg-gray-700 transition-colors duration-200"
				>
					<div
						class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mb-1"
					>
						<IconMenu />
					</div>
					Menus
				</a>

				<a
					href="/pos/customer-touch/home"
					class="flex flex-col items-center px-4 py-3 text-lg font-medium hover:bg-gray-700 transition-colors duration-200"
				>
					<div
						class="w-12 h-12 rounded-full border-2 border-gray-400 flex items-center justify-center mb-1"
					>
						<IconBurger />
					</div>
					Burgers
				</a>

				<a
					href="/pos/customer-touch/home"
					class="flex flex-col items-center px-4 py-3 text-lg font-medium hover:bg-gray-700 transition-colors duration-200"
				>
					<div
						class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mb-1"
					>
						<IconSalad />
					</div>
					Salades
				</a>

				<a
					href="/pos/customer-touch/home"
					class="flex flex-col items-center px-4 py-3 text-lg font-medium hover:bg-gray-700 transition-colors duration-200"
				>
					<div
						class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mb-1"
					>
						<IconDrink />
					</div>
					Boissons
				</a>

				<a
					href="/pos/customer-touch/home"
					class="flex flex-col items-center px-4 py-3 text-lg font-medium hover:bg-gray-700 transition-colors duration-200"
				>
					<div
						class="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center mb-1"
					>
						<IconDessert />
					</div>
					Desserts
				</a>
			</nav>
		</aside>

		<main class="flex flex-col bg-gray-100 border rounded-lg">
			<div class="p-2 text-center">
				<h2 class="text-3xl font-bold text-gray-900 mb-4">CMS content / Searchlist</h2>
				<div class="grid grid-cols-3 gap-2 h-[90vh] overflow-scroll">
					{#each data.products as product}
						<div class="rounded-xl w-full items-center mx-auto">
							<div class="relative w-full h-40">
								<PictureComponent
									picture={picturesByProduct[product._id]}
									class="object-cover w-full h-full rounded-xl shadow-md"
								/>
								<span class="absolute top-2 right-2 bg-white text-black px-2 rounded-lg">
									<PriceTag
										amount={product.price.amount}
										currency={product.price.currency}
										secondary
									/>
								</span>
							</div>
							<p class="mt-4 text-center px-1 text-xs break-words break-all">
								{product.name.toUpperCase()}
							</p>
						</div>
					{/each}
				</div>
			</div>
		</main>
		<div class="bg-sidebar-dark text-white flex justify-center font-bold p-4 mb-8">
			<button>Abandon</button>
		</div>
		<div class="bg-bottom-bar-green text-white flex justify-center font-bold p-4 mb-8">
			<button>CHF 11.99 / Terminer</button>
		</div>
	</div>
</div>

<style>
	.bg-sidebar-dark {
		background-color: #2f2f32;
	}
	.bg-bottom-bar-green {
		background-color: #6ae424;
	}
</style>
