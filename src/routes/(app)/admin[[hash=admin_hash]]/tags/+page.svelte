<script lang="ts">
	import { typedKeys } from '$lib/utils/typedKeys.js';

	export let data;
	const tagsCreators = data.tags.filter((tag) => tag.family === 'creators');
	const tagsRetailers = data.tags.filter((tag) => tag.family === 'retailers');
	const tagsTemporal = data.tags.filter((tag) => tag.family === 'temporal');
	const tagsEvents = data.tags.filter((tag) => tag.family === 'events');
	let showTags = {
		creators: false,
		retailers: false,
		events: false,
		temporal: false
	};
	function toggleTagsVisibility(category: string) {
		if (category === 'creators') {
			showTags.creators = !showTags.creators;
		}
		if (category === 'retailers') {
			showTags.retailers = !showTags.retailers;
		}
		if (category === 'temporal') {
			showTags.temporal = !showTags.temporal;
		}
		if (category === 'events') {
			showTags.events = !showTags.events;
		}
	}
	const specialTags = {
		'pos-favorite': 'Products with this tag will be dispalyed by default on /pos/touch interface'
	};
	const tagsMap = new Map(data.tags.map((tag) => [tag._id, tag]));
</script>

<a href="{data.adminPrefix}/tags/new" class="underline block">Create new tag</a>

<h1 class="text-3xl">List of Tags</h1>

<div>
	Family : <b>Creators</b>
	<a
		href="#creators"
		class="text-blue-500 underline"
		on:click={() => toggleTagsVisibility('creators')}
	>
		({showTags.creators ? 'reduce' : 'expand'})
	</a><br />
	{#if showTags.creators}
		<ul class="ml-5">
			{#each tagsCreators as tag}
				<li>
					<a href="{data.adminPrefix}/tags/{tag._id}" class="underline text-blue">
						{tag.name}
					</a>
					- <span class="text-gray-550">[Tag={tag._id}]</span>
				</li>
			{:else}
				No tags yet
			{/each}
		</ul>
	{/if}
	Family : <b>Retailers</b>
	<a
		href="#retailers"
		class="text-blue-500 underline"
		on:click={() => toggleTagsVisibility('retailers')}
	>
		({showTags.retailers ? 'reduce' : 'expand'})
	</a><br />
	{#if showTags.retailers}
		<ul class="ml-5">
			{#each tagsRetailers as tag}
				<li>
					<a href="{data.adminPrefix}/tags/{tag._id}" class="underline text-blue">
						{tag.name}
					</a>
					- <span class="text-gray-550">[Tag={tag._id}]</span>
				</li>
			{:else}
				No tags yet
			{/each}
		</ul>
	{/if}
	Family : <b>Temporal</b>
	<a
		href="#temporal"
		class="text-blue-500 underline"
		on:click={() => toggleTagsVisibility('temporal')}
	>
		({showTags.temporal ? 'reduce' : 'expand'})
	</a><br />
	{#if showTags.temporal}
		<ul class="ml-5">
			{#each tagsTemporal as tag}
				<li>
					<a href="{data.adminPrefix}/tags/{tag._id}" class="underline text-blue">
						{tag.name}
					</a>
					- <span class="text-gray-550">[Tag={tag._id}]</span>
				</li>
			{:else}
				No tags yet
			{/each}
		</ul>
	{/if}
	Family : <b>Events</b>
	<a href="#events" class="text-blue-500 underline" on:click={() => toggleTagsVisibility('events')}>
		({showTags.events ? 'reduce' : 'expand'})
	</a><br />
	{#if showTags.events}
		<ul class="ml-5">
			{#each tagsEvents as tag}
				<li>
					<a href="{data.adminPrefix}/tags/{tag._id}" class="underline text-blue">
						{tag.name}
					</a>
					- <span class="text-gray-550">[Tag={tag._id}]</span>
				</li>
			{:else}
				No tags yet
			{/each}
		</ul>
	{/if}
</div>

{#if typedKeys(specialTags).some((key) => tagsMap.has(key))}
	<h2 class="text-2xl">Existing Special tag</h2>

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
						<a href="{data.adminPrefix}/tags/{specialTag}" class="underline">
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
	<h2 class="text-2xl">Suggestions</h2>

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
						<a href="{data.adminPrefix}/tags/new?id={specialTag}" class="underline">
							{specialTag}
						</a>
					</td>
					<td class="border border-gray-300 p-2">{specialTags[specialTag]}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
