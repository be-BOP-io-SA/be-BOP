<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import type { Tag } from '$lib/types/Tag';

	export let tags: Pick<Tag, '_id' | 'name'>[];
	export let currentFilter: string;
	export let onSelect: (filterId: string) => void;

	const { t } = useI18n();

	let isOpen = false;

	interface Option {
		id: string;
		label: string;
	}

	$: options = [
		{ id: 'pos-favorite', label: t('pos.touch.favorites') },
		...tags.map((tag) => ({ id: tag._id, label: tag.name })),
		{ id: 'all', label: t('pos.touch.allProducts') }
	] as Option[];

	$: currentLabel =
		options.find((opt) => opt.id === currentFilter)?.label || t('pos.touch.favorites');

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function selectOption(optionId: string) {
		onSelect(optionId);
		isOpen = false;
	}

	function closeDropdown() {
		isOpen = false;
	}
</script>

<div class="relative w-full">
	<!-- bg-[#310d40] and text-white are added directly to avoid race condition with touch.css loading -->
	<button
		type="button"
		class="touchScreen-category-cta bg-[#310d40] text-white w-full flex items-center justify-between text-3xl px-6 min-h-[4.25rem]"
		on:click={toggleDropdown}
	>
		<span class="uppercase">{currentLabel}</span>
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
		<!-- Backdrop -->
		<div
			class="fixed inset-0 z-40"
			on:click={closeDropdown}
			role="button"
			tabindex="-1"
			on:keydown={(e) => e.key === 'Escape' && closeDropdown()}
		></div>

		<!-- Dropdown -->
		<div
			class="absolute top-full left-0 right-0 mt-2 bg-white shadow-[0_0_0_4px_rgba(0,0,0,0.8)] max-h-[60vh] overflow-y-auto z-50"
			on:click|stopPropagation
			on:keydown={(e) => {
				if (e.key === 'Escape') {
					closeDropdown();
				}
			}}
			role="menu"
			tabindex="-1"
		>
			{#each options as option}
				<button
					type="button"
					class="w-full text-left px-6 py-4 text-2xl font-medium uppercase border-b border-gray-200 transition-colors hover:bg-gray-100 hover:text-purple-600 {option.id ===
					currentFilter
						? 'bg-purple-100 text-purple-600 font-bold'
						: 'text-gray-900'}"
					on:click={() => selectOption(option.id)}
					role="menuitem"
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
