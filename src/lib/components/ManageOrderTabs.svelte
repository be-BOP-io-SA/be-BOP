<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import {
		poolSlugs,
		resolvePoolLabel,
		sluggifyTab,
		type PosTab,
		type PosTabGroup
	} from '$lib/types/PosTabGroup';

	export let tabGroups: PosTabGroup[] = [];
	export let nonEmptyPoolSlugs: string[] = [];

	const { t } = useI18n();
	// Order tabs are keyed by the slugs of the saved config, not of the edited one.
	const savedTabGroups: PosTabGroup[] = structuredClone(tabGroups);

	function keepsNonEmptyPools(nextTabGroups: PosTabGroup[], deletedSlug?: string): boolean {
		const nextSlugs = new Set(poolSlugs(nextTabGroups));
		// Deleting a row mid-group drops the last slug, not its own: its items would slide under the
		// next pool's label, so the row itself counts too.
		const stranded = nonEmptyPoolSlugs.filter(
			(slug) => !nextSlugs.has(slug) || slug === deletedSlug
		);
		if (stranded.length) {
			alert(
				t('admin.pos.poolsHoldItems', {
					pools: stranded.map((slug) => resolvePoolLabel(savedTabGroups, slug)).join(', ')
				})
			);
		}
		return !stranded.length;
	}

	function addGroup(name: string) {
		tabGroups.push({ name, tabs: [] });
		tabGroups = tabGroups; // Force reactivity
	}

	function deleteGroup(groupIndex: number) {
		if (!keepsNonEmptyPools(tabGroups.filter((_, i) => i !== groupIndex))) {
			return;
		}
		tabGroups.splice(groupIndex, 1);
		tabGroups = tabGroups; // Force reactivity
	}

	function renameGroup(groupIndex: number, newName: string) {
		tabGroups[groupIndex].name = newName;
		tabGroups = tabGroups; // Force reactivity
	}

	let nameBeforeEdit = '';

	// Checked when leaving the field, so typing a new name is not interrupted at each key.
	function confirmGroupName(groupIndex: number, input: HTMLInputElement) {
		if (!keepsNonEmptyPools(tabGroups)) {
			input.value = nameBeforeEdit;
			renameGroup(groupIndex, nameBeforeEdit);
		}
	}

	function updateLabel(groupIndex: number, tabIndex: number, newLabel?: string) {
		tabGroups[groupIndex].tabs[tabIndex].label = newLabel;
		tabGroups = tabGroups; // Force reactivity
	}

	function updateColor(groupIndex: number, tabIndex: number, newColor?: string) {
		tabGroups[groupIndex].tabs[tabIndex].color = newColor;
		tabGroups = tabGroups; // Force reactivity
	}

	function addTab(groupIndex: number) {
		tabGroups[groupIndex].tabs.push({});
		tabGroups = tabGroups; // Force reactivity
	}

	function deleteTab(groupIndex: number, tabIndex: number) {
		const next = tabGroups.map((group, i) =>
			i === groupIndex ? { ...group, tabs: group.tabs.filter((_, j) => j !== tabIndex) } : group
		);
		if (!keepsNonEmptyPools(next, sluggifyTab(tabGroups, groupIndex, tabIndex))) {
			return;
		}
		tabGroups[groupIndex].tabs.splice(tabIndex, 1);
		tabGroups = tabGroups; // Force reactivity
	}

	function moveTab(groupIndex: number, tabIndex: number, direction: 'up' | 'down') {
		const tab = tabGroups[groupIndex].tabs[tabIndex];
		const newIndex = direction === 'up' ? tabIndex - 1 : tabIndex + 1;
		tabGroups[groupIndex].tabs.splice(tabIndex, 1);
		tabGroups[groupIndex].tabs.splice(newIndex, 0, tab);
		tabGroups = tabGroups; // Force reactivity
	}

	function tabColor(tab: PosTab): string {
		return tab.color ?? '#9333ea';
	}

	function inputValue(e: Event): string {
		return (e.target as HTMLInputElement)?.value;
	}
</script>

<div>
	<div class="flex flex-col gap-4">
		{#each tabGroups as group, groupIndex}
			<div class="border rounded-lg shadow-sm w-fit">
				<div class="flex justify-between items-center bg-gray-100 gap-2 px-4 py-2">
					<input
						type="text"
						placeholder="Group Name"
						value={group.name}
						class="border font-semibold rounded px-2 py-1 text-sm"
						on:focus={() => (nameBeforeEdit = group.name)}
						on:input={(e) => renameGroup(groupIndex, inputValue(e))}
						on:change={(e) => confirmGroupName(groupIndex, e.currentTarget)}
					/>
					<button
						type="button"
						class="text-sm text-red-600 hover:underline"
						on:click={() => deleteGroup(groupIndex)}>Delete Group</button
					>
				</div>

				<ul class="divide-y">
					{#each group.tabs as tab, tabIndex}
						{@const isFirst = tabIndex === 0}
						{@const isLast = tabIndex === group.tabs.length - 1}
						<li class="flex items-center justify-between gap-2 px-4 py-2">
							<div class="flex items-center gap-2 space-x-2">
								<span class="w-1">{tabIndex + 1}</span>
								<div class="w-4 h-4 rounded-full" style="background-color: {tabColor(tab)}"></div>
								<input
									type="text"
									placeholder="Label"
									value={tab.label ?? ''}
									class="border rounded px-2 py-1 text-sm"
									on:input={(e) => updateLabel(groupIndex, tabIndex, inputValue(e))}
								/>
								<input
									type="color"
									value={tab.color}
									on:input={(e) => updateColor(groupIndex, tabIndex, inputValue(e))}
								/>
								<button
									class={isFirst ? 'invisible' : 'text-sm text-red-600 hover:underline'}
									type="button"
									disabled={isFirst}
									on:click={() => moveTab(groupIndex, tabIndex, 'up')}
								>
									Up
								</button>
								<button
									class={isLast ? 'invisible' : 'text-sm text-red-600 hover:underline'}
									type="button"
									on:click={() => moveTab(groupIndex, tabIndex, 'down')}
								>
									Down
								</button>
								<button
									class="text-sm text-red-600 hover:underline"
									type="button"
									on:click={() => deleteTab(groupIndex, tabIndex)}
								>
									Delete
								</button>
							</div>
						</li>
					{/each}
					<li class="flex items-center justify-between gap-2 px-4 py-2">
						<button
							type="button"
							class="text-sm text-blue-600 hover:underline"
							on:click={() => addTab(groupIndex)}
						>
							Add Tab
						</button>
					</li>
				</ul>
			</div>
		{/each}
		<div class="border rounded-lg shadow-sm w-fit">
			<div class="flex justify-center items-center bg-gray-50 px-4 py-2">
				<button
					type="button"
					class="text-sm text-blue-600 hover:underline"
					on:click={() => addGroup('New Group')}
				>
					Add Group
				</button>
			</div>
		</div>
	</div>
</div>
