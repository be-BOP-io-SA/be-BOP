<script lang="ts">
	import type { Tag } from '$lib/types/Tag';
	import type { PrintTicketOptions } from '$lib/types/PrintTicketOptions';
	import type { PrintHistoryEntry } from '$lib/types/PrintHistoryEntry';
	import { format } from 'date-fns';

	export let isOpen: boolean;
	export let availableTags: Array<Pick<Tag, '_id' | 'name'>>;
	export let hasNewItems = true;
	export let printHistory: PrintHistoryEntry[] = [];
	export let onConfirm: (options: PrintTicketOptions) => void;
	export let onCancel: () => void;
	export let onReprintFromHistory: (entry: PrintHistoryEntry, historyIndex: number) => void;

	let activeTab: 'print' | 'history' = 'print';
	let mode: 'all' | 'newlyOrdered' = 'all';
	$: mode = hasNewItems ? 'newlyOrdered' : 'all';
	let tagFilter: Tag['_id'] | '' = '';

	$: reversedHistory = [...printHistory].reverse();

	const tabs = [
		{ id: 'print' as const, label: 'PRINT' },
		{ id: 'history' as const, label: 'HISTORY' }
	] as const;

	function formatTags(tags: string[]): string {
		if (tags.length === 0) {
			return '-';
		}
		if (tags.length <= 4) {
			return tags.join(', ');
		}
		return tags.slice(0, 4).join(', ') + '...';
	}

	function handleConfirm() {
		onConfirm({
			mode,
			tagFilter: tagFilter || undefined
		});
		isOpen = false;
	}

	function handleCancel() {
		onCancel();
		isOpen = false;
		activeTab = 'print';
	}

	function handleReprint(entry: PrintHistoryEntry, historyIndex: number) {
		onReprintFromHistory(entry, historyIndex);
		isOpen = false;
		activeTab = 'print';
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
		on:click={handleCancel}
		role="presentation"
	>
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<div
			class="bg-white p-4 rounded-lg w-[95vw] md:w-auto md:min-w-[800px] max-w-[90%] max-h-[90vh] shadow-lg flex flex-col"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="dialog"
			tabindex="-1"
		>
			<h2 class="text-2xl font-bold mb-3 text-center">
				PRINT TICKET{#if reversedHistory.length > 0}&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;&nbsp;{reversedHistory[0]
						.poolLabel}{/if}
			</h2>

			<div class="flex gap-2 mb-4 border-b-2">
				{#each tabs as tab}
					<button
						type="button"
						class="px-8 py-3 text-xl font-bold transition-colors border-b-4"
						class:border-blue-600={activeTab === tab.id}
						class:text-blue-600={activeTab === tab.id}
						class:border-transparent={activeTab !== tab.id}
						class:text-gray-600={activeTab !== tab.id}
						on:click={() => (activeTab = tab.id)}
					>
						{tab.label}
					</button>
				{/each}
			</div>

			<div class="flex-1 overflow-y-auto">
				{#if activeTab === 'print'}
					<div>
						<div class="mb-4">
							<div class="block font-bold mb-2 text-lg">PRINT MODE:</div>
							<label
								class="block my-2 text-lg"
								class:opacity-50={!hasNewItems}
								class:cursor-not-allowed={!hasNewItems}
								class:cursor-pointer={hasNewItems}
							>
								<input
									type="radio"
									bind:group={mode}
									value="newlyOrdered"
									class="mr-3 w-5 h-5"
									disabled={!hasNewItems}
								/>
								NEWLY ORDERED (DEFAULT)
							</label>
							<label class="block my-2 cursor-pointer text-lg">
								<input type="radio" bind:group={mode} value="all" class="mr-3 w-5 h-5" />
								ALL ITEMS
							</label>
						</div>

						<div class="mb-4">
							<label class="block font-bold mb-2 text-lg" for="tag-filter">TAG FILTER:</label>
							<select
								id="tag-filter"
								bind:value={tagFilter}
								class="w-full p-3 border-2 border-gray-300 rounded text-lg uppercase"
							>
								<option value="">All tags</option>
								{#each availableTags as tag}
									<option value={tag._id}>{tag.name}</option>
								{/each}
							</select>
						</div>

						<div class="flex gap-4 justify-center mt-6">
							<button
								type="button"
								class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xl font-bold"
								on:click={handleConfirm}
							>
								PRINT
							</button>
							<button
								type="button"
								class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-xl font-bold"
								on:click={handleCancel}
							>
								CANCEL
							</button>
						</div>
					</div>
				{:else if activeTab === 'history'}
					<div class="max-h-[500px] overflow-y-auto overflow-x-auto">
						{#if printHistory.length === 0}
							<p class="text-center text-gray-500 py-8 text-xl">No print history available</p>
						{:else}
							<table class="w-full">
								<thead class="bg-gray-100 sticky top-0">
									<tr>
										<th class="p-3 text-left font-bold text-base w-12">#</th>
										<th class="p-3 text-left font-bold text-base">TAGS</th>
										<th class="p-3 text-left font-bold text-base w-16">CNT</th>
										<th class="p-3 text-left font-bold text-base w-36 whitespace-nowrap"
											>DATETIME</th
										>
										<th class="p-3 text-center font-bold text-base w-32">PRINT</th>
									</tr>
								</thead>
								<tbody>
									{#each reversedHistory as entry, index}
										<tr class="border-b hover:bg-gray-50">
											<td class="p-3 text-base w-12">{index + 1}</td>
											<td class="p-3 text-base uppercase">{formatTags(entry.tagNames)}</td>
											<td class="p-3 text-base w-16">{entry.itemCount}</td>
											<td class="p-3 text-base w-36 whitespace-nowrap"
												>{format(new Date(entry.timestamp), 'dd MMM HH:mm').toUpperCase()}</td
											>
											<td class="p-3 text-center w-32">
												<button
													type="button"
													class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded"
													on:click={() => handleReprint(entry, printHistory.length - 1 - index)}
												>
													PRINT
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>

					<div class="flex gap-4 justify-center mt-4">
						<button
							type="button"
							class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-xl font-bold"
							on:click={handleCancel}
						>
							CLOSE
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
