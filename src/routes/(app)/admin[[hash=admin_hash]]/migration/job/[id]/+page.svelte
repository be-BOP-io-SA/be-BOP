<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	export let data;
	export let form;

	$: adminPrefix = $page.url.pathname.split('/migration')[0];

	let selected: Record<string, boolean> = {};
	$: selectedCount = Object.values(selected).filter(Boolean).length;

	function toggleAll(e: Event) {
		const checked = (e.target as HTMLInputElement).checked;
		const next: Record<string, boolean> = {};
		for (const obj of data.staged) next[obj._id] = checked;
		selected = next;
	}

	function countFor(type: string, status: string): number {
		return data.counts.find((c) => c.type === type && c.status === status)?.count ?? 0;
	}

	function totalFor(type: string): number {
		return data.counts.filter((c) => c.type === type).reduce((s, c) => s + c.count, 0);
	}

	$: typesWithData = data.availableTypes.filter((t) => totalFor(t) > 0);

	function labelOf(obj: { normalized?: Record<string, unknown> | null; sourceId: string }): string {
		const n = (obj.normalized ?? {}) as Record<string, unknown>;
		for (const key of ['title', 'name', 'label', 'slug']) {
			const v = n[key];
			if (typeof v === 'string' && v.trim()) return v;
		}
		return obj.sourceId;
	}

	function slugOf(obj: { normalized?: Record<string, unknown> | null }): string {
		const n = (obj.normalized ?? {}) as Record<string, unknown>;
		const v = n.slug;
		return typeof v === 'string' && v.trim() ? v : '';
	}

	/**
	 * Build a `?type=…&status=…` query string preserving whichever filter
	 * isn't being changed by this link. Pass an empty string to clear the
	 * dimension being changed.
	 */
	function withFilter(updates: { type?: string; status?: string }): string {
		const params = new URLSearchParams();
		const newType = 'type' in updates ? updates.type : data.typeFilter;
		const newStatus = 'status' in updates ? updates.status : data.statusFilter;
		if (newType) params.set('type', newType);
		if (newStatus) params.set('status', newStatus);
		const qs = params.toString();
		return qs ? `?${qs}` : '?';
	}
</script>

<a href="{adminPrefix}/migration" class="body-hyperlink underline">← Back to migrations</a>

<h1 class="text-3xl mt-2">Job {data.job._id}</h1>
<p>
	Source: <strong>{data.job.source}</strong> • Status: <strong>{data.job.status}</strong> •
	Created: {new Date(data.job.createdAt).toLocaleString()}
</p>

{#if data.job.error}
	<p class="text-red-500">Error: {data.job.error}</p>
{/if}

{#if data.job.skippedPhases && Object.keys(data.job.skippedPhases).length > 0}
	<section class="mt-4 border border-yellow-300 bg-yellow-50 rounded p-3">
		<p class="font-semibold text-yellow-800">Phases skipped during fetch</p>
		<ul class="list-disc list-inside text-sm text-yellow-900 mt-1">
			{#each Object.entries(data.job.skippedPhases) as [phase, reason]}
				<li><span class="font-mono">{phase}</span>: {reason}</li>
			{/each}
		</ul>
		<p class="text-xs text-yellow-700 mt-2">
			These phases didn't run because the source rejected our request (typically a permission
			issue with the connector credentials). The job is otherwise complete.
		</p>
	</section>
{/if}

<h2 class="text-2xl mt-6">Staged objects by type</h2>
{#if typesWithData.length === 0}
	<p>No staged object yet (job may still be running, refresh the page).</p>
{:else}
	<table class="w-full max-w-2xl">
		<thead>
			<tr>
				<th class="text-left">Type</th>
				<th class="text-left">Promotable?</th>
				<th class="text-right">Staged</th>
				<th class="text-right">Promoted</th>
				<th class="text-right">Ignored</th>
				<th class="text-right">Total</th>
			</tr>
		</thead>
		<tbody>
			{#each typesWithData as type}
				<tr>
					<td>
						<a
							href={withFilter({ type })}
							class={data.typeFilter === type
								? 'font-bold body-hyperlink underline'
								: 'body-hyperlink underline'}
						>
							{type}
						</a>
					</td>
					<td class="text-sm">
						{#if data.promotableTypes.includes(type)}
							<span class="text-green-600">yes</span>
						{:else}
							<span class="text-gray-500">not implemented yet</span>
						{/if}
					</td>
					<td class="text-right">{countFor(type, 'staged')}</td>
					<td class="text-right">{countFor(type, 'promoted')}</td>
					<td class="text-right">{countFor(type, 'ignored')}</td>
					<td class="text-right">{totalFor(type)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<h2 class="text-2xl mt-6">
	Objects
	{#if data.typeFilter || data.statusFilter}
		<a href="?" class="text-sm body-hyperlink underline">(clear filters)</a>
	{/if}
</h2>

<div class="flex gap-2 mb-1 text-sm flex-wrap">
	<span class="font-semibold">Type:</span>
	<a
		href={withFilter({ type: '' })}
		class={!data.typeFilter ? 'font-bold' : 'body-hyperlink underline'}
	>
		all
	</a>
	{#each typesWithData as type}
		<a
			href={withFilter({ type })}
			class={data.typeFilter === type ? 'font-bold' : 'body-hyperlink underline'}
		>
			{type}
		</a>
	{/each}
</div>

<div class="flex gap-2 mb-2 text-sm flex-wrap">
	<span class="font-semibold">Status:</span>
	<a
		href={withFilter({ status: '' })}
		class={!data.statusFilter ? 'font-bold' : 'body-hyperlink underline'}
	>
		all
	</a>
	{#each ['staged', 'promoted', 'ignored'] as status}
		<a
			href={withFilter({ status })}
			class={data.statusFilter === status ? 'font-bold' : 'body-hyperlink underline'}
		>
			{status}
		</a>
	{/each}
</div>

{#if data.staged.length === 0}
	<p>No object matches the current filter.</p>
{:else}
	<form method="post" use:enhance>
	<table class="w-full table-fixed">
		<colgroup>
			<col style="width: 4%" />
			<col style="width: 27%" />
			<col style="width: 17%" />
			<col style="width: 8%" />
			<col style="width: 9%" />
			<col style="width: 14%" />
			<col style="width: 14%" />
			<col style="width: 7%" />
		</colgroup>
		<thead>
			<tr>
				<th class="text-left">
					<input
						type="checkbox"
						class="form-checkbox"
						on:change={toggleAll}
						checked={selectedCount > 0 && selectedCount === data.staged.length}
					/>
				</th>
				<th class="text-left">Title</th>
				<th class="text-left">Slug</th>
				<th class="text-left">Type</th>
				<th class="text-left">Status</th>
				<th class="text-left">Promoted as</th>
				<th class="text-left">Source</th>
				<th class="text-left"></th>
			</tr>
		</thead>
		<tbody>
			{#each data.staged as obj}
				<tr class="border-b">
					<td class="py-2">
						<input
							type="checkbox"
							class="form-checkbox"
							name="staged_id"
							value={obj._id}
							bind:checked={selected[obj._id]}
						/>
					</td>
					<td class="py-2">
						<a
							href="{adminPrefix}/migration/staged/{obj._id}"
							class="body-hyperlink block truncate"
							title={labelOf(obj)}
						>
							{labelOf(obj)}
						</a>
					</td>
					<td class="font-mono text-sm">
						<span class="block truncate" title={slugOf(obj)}>{slugOf(obj) || '—'}</span>
					</td>
					<td class="text-sm">
						<span class="block truncate" title={obj.type}>{obj.type}</span>
					</td>
					<td>
						<span
							class={obj.status === 'promoted'
								? 'text-green-600'
								: obj.status === 'ignored'
									? 'text-gray-500'
									: ''}
						>
							{obj.status}
						</span>
					</td>
					<td class="text-sm font-mono">
						<span class="block truncate" title={obj.promotedAsId ?? ''}>
							{obj.promotedAsId ?? '—'}
						</span>
					</td>
					<td class="text-xs font-mono text-gray-500">
						<span class="block truncate" title={obj.sourceId}>{obj.sourceId}</span>
						<span class="block truncate text-gray-400" title={obj.sourceType}>
							{obj.sourceType}
						</span>
					</td>
					<td>
						<a
							href="{adminPrefix}/migration/staged/{obj._id}"
							class="body-hyperlink underline"
						>
							View
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="mt-3 flex flex-wrap gap-2 items-center">
		<span class="text-sm text-gray-600">{selectedCount} selected</span>
		<button
			type="submit"
			formaction="?/bulkPromote"
			class="btn btn-black"
			disabled={selectedCount === 0}
		>
			Promote selected
		</button>
		<button
			type="submit"
			formaction="?/bulkIgnore"
			class="btn btn-gray"
			disabled={selectedCount === 0}
		>
			Ignore selected
		</button>
	</div>

	{#if form?.error}
		<p class="text-red-500 mt-2">{form.error}</p>
	{/if}
	{#if form?.bulk}
		<section class="mt-4 border border-gray-200 rounded p-3">
			<p class="font-semibold">
				Bulk {form.bulk.action}: {form.bulk.success.length} succeeded,
				{form.bulk.failed.length} failed
			</p>
			{#if form.bulk.failed.length > 0}
				<ul class="list-disc list-inside text-sm text-red-600 mt-2">
					{#each form.bulk.failed as f}
						<li><span class="font-mono">{f.stagedId}</span>: {f.error}</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
	</form>
{/if}
