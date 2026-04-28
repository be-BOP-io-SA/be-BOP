<script lang="ts">
	import { page } from '$app/stores';

	export let data;

	$: adminPrefix = $page.url.pathname.split('/migration')[0];

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
							href="?type={type}"
							class={data.typeFilter === type ? 'font-bold body-hyperlink underline' : 'body-hyperlink underline'}
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

<div class="flex gap-2 mb-2 text-sm">
	<span>Filter:</span>
	<a
		href="?type={data.typeFilter}"
		class={!data.statusFilter ? 'font-bold' : 'body-hyperlink underline'}
	>
		all
	</a>
	{#each ['staged', 'promoted', 'ignored'] as status}
		<a
			href="?{data.typeFilter ? `type=${data.typeFilter}&` : ''}status={status}"
			class={data.statusFilter === status ? 'font-bold' : 'body-hyperlink underline'}
		>
			{status}
		</a>
	{/each}
</div>

{#if data.staged.length === 0}
	<p>No object matches the current filter.</p>
{:else}
	<table class="w-full table-fixed">
		<colgroup>
			<col style="width: 30%" />
			<col style="width: 18%" />
			<col style="width: 8%" />
			<col style="width: 9%" />
			<col style="width: 14%" />
			<col style="width: 14%" />
			<col style="width: 7%" />
		</colgroup>
		<thead>
			<tr>
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
{/if}
