<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import AcceptIgnoreList from '$lib/components/AcceptIgnoreList.svelte';

	export let data;
	export let form;

	$: adminPrefix = $page.url.pathname.split('/migration')[0];
	$: hasProposedChanges =
		data.proposedChanges && data.proposedChanges.length > 0 && data.staged.status === 'staged';

	let showRaw = false;
</script>

<a href="{adminPrefix}/migration/job/{data.staged.jobId}" class="body-hyperlink underline">
	← Back to job
</a>

<h1 class="text-3xl mt-2">
	{data.staged.type}
	<span class="text-base font-mono text-gray-500">{data.staged.sourceId}</span>
</h1>

<p>
	Source: <strong>{data.staged.source}</strong> • Native source type:
	<span class="font-mono">{data.staged.sourceType}</span>
	• Status:
	<span
		class={data.staged.status === 'promoted'
			? 'text-green-600 font-semibold'
			: data.staged.status === 'ignored'
				? 'text-gray-500 font-semibold'
				: 'font-semibold'}
	>
		{data.staged.status}
	</span>
	{#if data.staged.promotedAsId}
		• Promoted as <span class="font-mono">{data.staged.promotedAsId}</span>
	{/if}
</p>

{#if data.staged.origins && data.staged.origins.length > 0}
	<section class="mt-4">
		<h2 class="text-xl">Origins</h2>
		<ul class="list-disc list-inside text-sm">
			{#each data.staged.origins as origin}
				<li class="font-mono">{JSON.stringify(origin)}</li>
			{/each}
		</ul>
	</section>
{/if}

<section class="mt-6">
	<h2 class="text-2xl">Actions</h2>

	{#if form?.error}
		<p class="text-red-500 mb-2">{form.error}</p>
	{/if}
	{#if form?.promoted}
		<p class="text-green-600 mb-2">
			Promoted as <span class="font-mono">{form.promoted.promotedAsId}</span>
			{#if form.promoted.promotedAsLabel}({form.promoted.promotedAsLabel}){/if}
		</p>
	{/if}
	{#if form?.ignored}
		<p class="text-gray-600 mb-2">Ignored.</p>
	{/if}
	{#if form?.unignored}
		<p class="text-gray-600 mb-2">Restored to staged.</p>
	{/if}

	<div class="flex flex-wrap gap-2 items-center">
		<a
			href="{adminPrefix}/migration/staged/{data.staged._id}/preview"
			class="btn btn-gray"
			target="_blank"
		>
			Open preview
		</a>

		{#if data.staged.status === 'promoted'}
			<span class="text-gray-500">(already promoted, no further action)</span>
		{:else if !data.promoter}
			<span class="text-gray-500">
				Promotion not implemented for type "{data.staged.type}" yet.
			</span>
		{:else if !hasProposedChanges}
			<form method="post" use:enhance class="inline">
				<button class="btn btn-black" formaction="?/promote">
					{data.promoter.actionLabel}
				</button>
			</form>
		{/if}

		{#if data.staged.status !== 'promoted'}
			<form method="post" use:enhance class="inline">
				{#if data.staged.status === 'ignored'}
					<button class="btn btn-gray" formaction="?/unignore">Restore</button>
				{:else}
					<button class="btn btn-gray" formaction="?/ignore">Ignore</button>
				{/if}
			</form>
		{/if}
	</div>
</section>

{#if hasProposedChanges && data.proposedChanges && data.promoter}
	<section class="mt-6">
		<h2 class="text-2xl">Proposed changes</h2>
		<p class="text-sm text-gray-600 mb-3">
			Tick the changes to apply, untick to ignore. Disabled rows require an upstream
			dependency to be resolved first (e.g. linked image promoted).
		</p>
		<form method="post" action="?/promote" use:enhance class="flex flex-col gap-3">
			<AcceptIgnoreList items={data.proposedChanges} />
			<button class="btn btn-black self-start">{data.promoter.actionLabel}</button>
		</form>
	</section>
{/if}

<section class="mt-6">
	<h2 class="text-2xl">Normalized fields</h2>
	{#if data.staged.normalized}
		<table class="w-full">
			<tbody>
				{#each Object.entries(data.staged.normalized) as [key, value]}
					<tr>
						<td class="align-top font-semibold pr-4 w-48">{key}</td>
						<td class="font-mono whitespace-pre-wrap break-words text-sm">
							{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p class="text-gray-500">No normalized payload (orphan or unprocessed).</p>
	{/if}
</section>

<section class="mt-6">
	<h2 class="text-2xl">
		Raw source
		<button class="btn btn-gray text-sm ml-2" on:click={() => (showRaw = !showRaw)}>
			{showRaw ? 'Hide' : 'Show'}
		</button>
	</h2>
	{#if showRaw}
		<pre class="text-xs bg-gray-100 p-3 overflow-auto max-h-[600px]">{JSON.stringify(
				data.staged.raw,
				null,
				2
			)}</pre>
	{/if}
</section>
