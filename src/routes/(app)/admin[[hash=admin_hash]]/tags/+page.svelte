<script lang="ts">
	import { enhance } from '$app/forms';
	import { typedKeys } from '$lib/utils/typedKeys.js';
	import IconTrash from '$lib/components/icons/IconTrash.svelte';

	export let data;
	export let form;

	// Group tags by family
	$: tagsByFamily = data.families.map((family) => ({
		family,
		tags: data.tags.filter((tag) => tag.family === family._id)
	}));

	// Orphan tags (no family)
	$: orphanTags = data.tags.filter((tag) => !tag.family);

	// Expand/collapse state - default all to expanded
	let expandedFamilies: Record<string, boolean> = {};
	$: {
		for (const family of data.families) {
			if (expandedFamilies[family._id] === undefined) {
				expandedFamilies[family._id] = true;
			}
		}
		if (expandedFamilies['_orphan'] === undefined) {
			expandedFamilies['_orphan'] = true;
		}
	}

	function expandAll() {
		for (const family of data.families) {
			expandedFamilies[family._id] = true;
		}
		expandedFamilies['_orphan'] = true;
		expandedFamilies = expandedFamilies;
	}

	function collapseAll() {
		for (const family of data.families) {
			expandedFamilies[family._id] = false;
		}
		expandedFamilies['_orphan'] = false;
		expandedFamilies = expandedFamilies;
	}

	// New family form
	let newFamilyName = '';

	// Delete confirmation
	let deletingFamilyId: string | null = null;

	function confirmDelete(familyId: string) {
		deletingFamilyId = familyId;
	}

	function cancelDelete() {
		deletingFamilyId = null;
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

<!-- Add new family -->
<div class="mb-6 p-4 bg-gray-100 rounded">
	<h2 class="text-xl mb-2">Tag Families</h2>
	<form method="post" action="?/createFamily" use:enhance class="flex gap-2 items-end">
		<label class="form-label">
			New family name
			<input
				type="text"
				name="name"
				class="form-input"
				bind:value={newFamilyName}
				placeholder="Enter family name"
				required
			/>
		</label>
		<button type="submit" class="btn btn-black">Add Family</button>
	</form>
	{#if form?.error && !form?.requiresForce}
		<p class="text-red-500 mt-2">{form.error}</p>
	{/if}
</div>

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

				<!-- Delete button -->
				{#if deletingFamilyId === family._id}
					<form method="post" action="?/deleteFamily" use:enhance class="inline flex gap-1">
						<input type="hidden" name="id" value={family._id} />
						{#if form?.requiresForce && form?.familyId === family._id}
							<span class="text-red-500 text-sm">{form.error}</span>
							<input type="hidden" name="force" value="true" />
							<button type="submit" class="btn btn-red text-sm">Force Delete</button>
						{:else}
							<button type="submit" class="btn btn-red text-sm">Confirm</button>
						{/if}
						<button type="button" class="btn btn-gray text-sm" on:click={cancelDelete}>
							Cancel
						</button>
					</form>
				{:else}
					<button
						type="button"
						class="text-red-500 hover:text-red-700"
						title="Delete family"
						on:click={() => confirmDelete(family._id)}
					>
						<IconTrash />
					</button>
				{/if}
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
	{#if orphanTags.length > 0 || data.families.length === 0}
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
