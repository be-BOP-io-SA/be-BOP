<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import type { Tag } from '$lib/types/Tag';
	import type { TagGroup } from '$lib/types/TagGroup';

	export let tags: Pick<Tag, '_id' | 'name'>[];
	export let tagGroups: Pick<TagGroup, '_id' | 'name' | 'tagIds'>[] = [];
	export let currentFilter: string;
	export let onSelect: (filterId: string) => void;

	const { t } = useI18n();

	let isOpen = false;
	let currentGroupId: string | null = null;

	interface Option {
		id: string;
		label: string;
		type: 'special' | 'group' | 'tag';
	}

	$: shouldShowGroups = tagGroups.length >= 2;

	// Level 1: Groups or flat tags
	$: level1Options = shouldShowGroups
		? [
				{ id: 'pos-favorite', label: t('pos.touch.favorites'), type: 'special' as const },
				...tagGroups.map((g) => ({ id: g._id, label: g.name, type: 'group' as const })),
				{ id: 'all', label: t('pos.touch.allProducts'), type: 'special' as const }
		  ]
		: [
				{ id: 'pos-favorite', label: t('pos.touch.favorites'), type: 'tag' as const },
				...tags.map((t) => ({ id: t._id, label: t.name, type: 'tag' as const })),
				{ id: 'all', label: t('pos.touch.allProducts'), type: 'tag' as const }
		  ];

	// Level 2: Tags in selected group
	$: level2Options = currentGroupId
		? (() => {
				const group = tagGroups.find((g) => g._id === currentGroupId);
				return group
					? tags
							.filter((t) => group.tagIds.includes(t._id))
							.map((t) => ({ id: t._id, label: t.name, type: 'tag' as const }))
					: [];
		  })()
		: [];

	$: options = level2Options.length > 0 ? level2Options : level1Options;
	$: showBackButton = currentGroupId !== null;

	$: currentLabel = (() => {
		if (currentFilter === 'pos-favorite') {
			return t('pos.touch.favorites');
		}
		if (currentFilter === 'all') {
			return t('pos.touch.allProducts');
		}
		const tag = tags.find((t) => t._id === currentFilter);
		return tag ? tag.name : t('pos.touch.favorites');
	})();

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function selectOption(option: Option) {
		if (option.type === 'group') {
			currentGroupId = option.id;
		} else {
			onSelect(option.id);
			currentGroupId = null;
			isOpen = false;
		}
	}

	function goBack() {
		currentGroupId = null;
	}

	function closeDropdown() {
		isOpen = false;
		currentGroupId = null;
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
			{#if showBackButton}
				<button
					type="button"
					class="w-full text-left px-6 py-4 text-2xl font-medium uppercase border-b border-gray-300 bg-gray-50 hover:bg-gray-100"
					on:click={goBack}
					role="menuitem"
				>
					{t('pos.touch.back')}
				</button>
			{/if}

			{#each options as option}
				<button
					type="button"
					class="w-full text-left px-6 py-4 text-2xl font-medium uppercase border-b border-gray-200 transition-colors hover:bg-gray-100 hover:text-purple-600 {option.id ===
					currentFilter
						? 'bg-purple-100 text-purple-600 font-bold'
						: 'text-gray-900'}"
					on:click={() => selectOption(option)}
					role="menuitem"
				>
					{option.label}
					{#if option.type === 'group'}
						<span class="float-right">→</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>
