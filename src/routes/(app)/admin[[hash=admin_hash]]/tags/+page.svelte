<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { typedKeys } from '$lib/utils/typedKeys.js';
	import IconTrash from '$lib/components/icons/IconTrash.svelte';
	import type { TagFamily } from '$lib/types/TagFamily';

	export let data;

	// Local state for families (following /admin/pos pattern)
	let families: TagFamily[] = data.families.map((f) => ({ ...f }));

	// Sync local state when data changes (after form submission)
	$: if (data.families) {
		families = data.families.map((f) => ({ ...f }));
	}

	$: serializedFamilies = JSON.stringify(families);

	// Group tags by family
	$: tagsByFamily = families.map((family) => ({
		family,
		tags: data.tags.filter((tag) => tag.family === family._id)
	}));

	// Orphan tags (no family)
	$: orphanTags = data.tags.filter((tag) => !tag.family);

	// Expand/collapse state - default all to expanded
	let expandedFamilies: Record<string, boolean> = {};
	$: {
		for (const family of families) {
			if (expandedFamilies[family._id] === undefined) {
				expandedFamilies[family._id] = true;
			}
		}
		if (expandedFamilies['_orphan'] === undefined) {
			expandedFamilies['_orphan'] = true;
		}
	}

	function expandAll() {
		for (const family of families) {
			expandedFamilies[family._id] = true;
		}
		expandedFamilies['_orphan'] = true;
		expandedFamilies = expandedFamilies;
	}

	function collapseAll() {
		for (const family of families) {
			expandedFamilies[family._id] = false;
		}
		expandedFamilies['_orphan'] = false;
		expandedFamilies = expandedFamilies;
	}

	// New family input
	let newFamilyName = '';

	function addFamily() {
		if (!newFamilyName.trim()) {
			return;
		}
		const newFamily: TagFamily = {
			_id: `temp-${Date.now()}`,
			name: newFamilyName.trim(),
			order: families.length,
			createdAt: new Date(),
			updatedAt: new Date()
		};
		families = [...families, newFamily];
		expandedFamilies[newFamily._id] = true;
		newFamilyName = '';
	}

	function deleteFamily(familyId: string) {
		const family = families.find((f) => f._id === familyId);
		const tagsInFamily = data.tags.filter((t) => t.family === familyId).length;

		if (tagsInFamily > 0) {
			if (
				!confirm(
					`This family "${family?.name}" has ${tagsInFamily} tag(s). Deleting it will dissociate these tags. Continue?`
				)
			) {
				return;
			}
		}

		families = families.filter((f) => f._id !== familyId);
		delete expandedFamilies[familyId];
	}

	// Special tags
	const specialTags = {
		'pos-favorite': 'Products with this tag will be displayed by default on /pos/touch interface'
	};
	const tagsMap = new Map(data.tags.map((tag) => [tag._id, tag]));
</script>

<a href="{data.adminPrefix}/tags/new" class="underline block mb-4">Create new tag</a>

<h1 class="text-3xl mb-4">List of Tags</h1>

<!-- Legend -->
<div class="mb-4 text-sm text-gray-600 flex flex-wrap gap-3">
	<span class="font-semibold">Legend:</span>
	<span title="Widget use only">🧩 Widget only</span>
	<span title="Product tagging">🏷️ Product tagging</span>
	<span title="Light/dark mode">🌓 Light/dark</span>
	<span title="Reporting filter">📊 Reporting</span>
	<span title="Print receipt filter">🧾 Receipt</span>
</div>

<!-- Expand/Collapse All -->
<div class="flex gap-2 mb-4">
	<button class="btn btn-gray text-sm" on:click={expandAll}>Expand All</button>
	<button class="btn btn-gray text-sm" on:click={collapseAll}>Collapse All</button>
</div>

<!-- Family management (following /admin/pos pattern) -->
<form
	method="post"
	action="?/saveFamilies"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			await invalidateAll();
		};
	}}
	class="mb-6 p-4 bg-gray-100 rounded"
>
	<h2 class="text-xl mb-2">Tag Families</h2>

	<div class="flex gap-2 items-end mb-4">
		<label class="form-label">
			New family name
			<input
				type="text"
				class="form-input"
				bind:value={newFamilyName}
				placeholder="Enter family name"
				on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addFamily())}
			/>
		</label>
		<button type="button" class="btn btn-black" on:click={addFamily}>Add Family</button>
	</div>

	{#if families.length > 0}
		<div class="space-y-2 mb-4">
			{#each families as family, idx (family._id)}
				<div class="flex items-center gap-2 bg-white p-2 rounded border">
					<span class="text-gray-500 text-sm w-6">{idx + 1}.</span>
					<input
						type="text"
						bind:value={family.name}
						class="form-input flex-1"
						placeholder="Family name"
					/>
					<button
						type="button"
						class="text-red-500 hover:text-red-700"
						title="Delete family"
						on:click={() => deleteFamily(family._id)}
					>
						<IconTrash />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<input type="hidden" name="families" value={serializedFamilies} />
	<button type="submit" class="btn btn-blue text-white">Save Families</button>
</form>

<!-- Tag families list -->
<div class="space-y-4">
	{#each tagsByFamily as { family, tags }}
		<div class="border-l-4 border-gray-300 pl-4">
			<div class="flex items-center gap-2">
				<span>Family:</span>
				<b>{family.name}</b>
				<a
					href="#{family._id}"
					class="text-blue-500 underline text-sm"
					on:click|preventDefault={() =>
						(expandedFamilies[family._id] = !expandedFamilies[family._id])}
				>
					({expandedFamilies[family._id] ? 'collapse' : 'expand'})
				</a>
				<span class="text-gray-500 text-sm">({tags.length} tags)</span>
			</div>

			{#if expandedFamilies[family._id]}
				<ul class="ml-5 mt-2">
					{#each tags as tag}
						<li>
							<a href="{data.adminPrefix}/tags/{tag._id}" class="underline text-blue-600">
								{tag.name}
							</a>
							<span class="text-gray-500 text-sm">[Tag={tag._id}]</span>
							{#if tag.widgetUseOnly}<span title="Widget use only">🧩</span>{/if}
							{#if tag.productTagging}<span title="Product tagging">🏷️</span>{/if}
							{#if tag.useLightDark}<span title="Light/dark mode">🌓</span>{/if}
							{#if tag.reportingFilter}<span title="Reporting filter">📊</span>{/if}
							{#if tag.printReceiptFilter}<span title="Print receipt filter">🧾</span>{/if}
						</li>
					{:else}
						<li class="text-gray-500 italic">No tags in this family</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}

	<!-- Orphan tags -->
	{#if orphanTags.length > 0 || families.length === 0}
		<div class="border-l-4 border-orange-300 pl-4">
			<div class="flex items-center gap-2">
				<span>Family:</span>
				<b class="text-orange-600">Not associated to a family</b>
				<a
					href="#orphan"
					class="text-blue-500 underline text-sm"
					on:click|preventDefault={() =>
						(expandedFamilies['_orphan'] = !expandedFamilies['_orphan'])}
				>
					({expandedFamilies['_orphan'] ? 'collapse' : 'expand'})
				</a>
				<span class="text-gray-500 text-sm">({orphanTags.length} tags)</span>
			</div>

			{#if expandedFamilies['_orphan']}
				<ul class="ml-5 mt-2">
					{#each orphanTags as tag}
						<li>
							<a href="{data.adminPrefix}/tags/{tag._id}" class="underline text-blue-600">
								{tag.name}
							</a>
							<span class="text-gray-500 text-sm">[Tag={tag._id}]</span>
							{#if tag.widgetUseOnly}<span title="Widget use only">🧩</span>{/if}
							{#if tag.productTagging}<span title="Product tagging">🏷️</span>{/if}
							{#if tag.useLightDark}<span title="Light/dark mode">🌓</span>{/if}
							{#if tag.reportingFilter}<span title="Reporting filter">📊</span>{/if}
							{#if tag.printReceiptFilter}<span title="Print receipt filter">🧾</span>{/if}
						</li>
					{:else}
						<li class="text-gray-500 italic">No orphan tags</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>

<!-- Special tags section -->
{#if typedKeys(specialTags).some((key) => tagsMap.has(key))}
	<h2 class="text-2xl mt-8 mb-2">Existing Special Tags</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">Tag slug</th>
				<th class="text-left border border-gray-300 p-2">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each typedKeys(specialTags).filter((key) => tagsMap.has(key)) as specialTag}
				<tr>
					<td class="border border-gray-300 p-2">
						<a href="{data.adminPrefix}/tags/{specialTag}" class="underline body-hyperlink">
							{specialTag}
						</a>
					</td>
					<td class="border border-gray-300 p-2">{specialTags[specialTag]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

{#if typedKeys(specialTags).some((key) => !tagsMap.has(key))}
	<h2 class="text-2xl mt-8 mb-2">Suggestions</h2>

	<table class="border border-gray-300 divide-y divide-gray-300 border-collapse">
		<thead>
			<tr>
				<th class="text-left border border-gray-300 p-2">Tag slug</th>
				<th class="text-left border border-gray-300 p-2">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each typedKeys(specialTags).filter((key) => !tagsMap.has(key)) as specialTag}
				<tr>
					<td class="border border-gray-300 p-2">
						<a href="{data.adminPrefix}/tags/new?id={specialTag}" class="underline body-hyperlink">
							{specialTag}
						</a>
					</td>
					<td class="border border-gray-300 p-2">{specialTags[specialTag]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
