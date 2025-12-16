<script lang="ts">
	export let pools: Array<{ slug: string; name: string }>;
	export let selectedSlug: string;
	export let onSelect: (slug: string) => void;
	export let allOrderTabs: Array<{ slug: string; itemsCount?: number }> = [];
	export let emptyIcon = '';
	export let occupiedIcon = '';
	export let disabledSlugs: string[] = [];

	let isOpen = false;

	$: selectedName = pools.find((p) => p.slug === selectedSlug)?.name ?? selectedSlug;

	function getPoolIcon(poolSlug: string): string {
		const orderTab = allOrderTabs.find((t) => t.slug === poolSlug);
		const isEmpty = !orderTab || (orderTab.itemsCount ?? 0) === 0;
		return isEmpty ? emptyIcon : occupiedIcon;
	}
</script>

<div class="relative w-full">
	<button
		type="button"
		class="touchScreen-category-cta bg-[#310d40] text-white w-full flex items-center justify-between text-3xl px-6 min-h-[4.25rem]"
		on:click={() => (isOpen = !isOpen)}
	>
		<span class="uppercase">{selectedName} {getPoolIcon(selectedSlug)}</span>
		<svg
			class="w-8 h-8 transition-transform {isOpen ? 'rotate-180' : ''}"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="fixed inset-0 z-40"
			on:click={() => (isOpen = false)}
			on:keydown={(e) => e.key === 'Escape' && (isOpen = false)}
			role="button"
			tabindex="-1"
		></div>
		<div
			class="absolute top-full left-0 right-0 mt-2 bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.8)] max-h-[60vh] overflow-y-auto z-50"
		>
			{#each pools as pool}
				{@const isDisabled = disabledSlugs.includes(pool.slug)}
				<button
					type="button"
					disabled={isDisabled}
					class="w-full text-left px-6 py-4 text-2xl font-medium uppercase border-b border-gray-200 transition-colors {isDisabled
						? 'bg-gray-200 text-gray-400 cursor-not-allowed'
						: pool.slug === selectedSlug
						? 'bg-purple-100 text-purple-600 font-bold'
						: 'text-gray-900 hover:bg-gray-100 hover:text-purple-600'}"
					on:click={() => {
						onSelect(pool.slug);
						isOpen = false;
					}}
				>
					{pool.name}
					{getPoolIcon(pool.slug)}
				</button>
			{/each}
		</div>
	{/if}
</div>
