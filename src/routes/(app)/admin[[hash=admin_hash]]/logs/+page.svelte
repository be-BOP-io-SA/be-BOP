<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';

	export let data;
	export let form;

	let filter = '';
	let streamFilter: 'all' | 'stdout' | 'stderr' = 'all';
	let autoRefresh = false;
	let refreshSeconds = 5;
	let timer: ReturnType<typeof setInterval> | null = null;

	$: filtered = data.lines.filter((l) => {
		if (streamFilter !== 'all' && l.stream !== streamFilter) return false;
		if (filter && !l.text.toLowerCase().includes(filter.toLowerCase())) return false;
		return true;
	});

	function toggleAutoRefresh() {
		if (autoRefresh) {
			if (timer) clearInterval(timer);
			timer = setInterval(() => invalidateAll(), refreshSeconds * 1000);
		} else if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	$: autoRefresh, refreshSeconds, toggleAutoRefresh();

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});
</script>

<h1 class="text-3xl">Runtime logs</h1>

<p class="my-2">
	In-memory capture of <code>process.stdout</code> + <code>process.stderr</code>. Last {data.lines.length}
	lines. Cleared on server restart.
</p>

{#if form?.success}
	<p class="alert-success">{form.success}</p>
{/if}

<div class="flex flex-wrap gap-2 items-center my-2">
	<input
		type="text"
		placeholder="filter text…"
		bind:value={filter}
		class="form-input"
		style="min-width: 240px"
	/>
	<select bind:value={streamFilter} class="form-select">
		<option value="all">stdout + stderr</option>
		<option value="stdout">stdout only</option>
		<option value="stderr">stderr only</option>
	</select>
	<button class="btn btn-blue" on:click={() => invalidateAll()}>Refresh</button>
	<label class="flex items-center gap-1">
		<input type="checkbox" bind:checked={autoRefresh} />
		auto-refresh every
	</label>
	<input type="number" min="1" max="60" bind:value={refreshSeconds} class="form-input w-16" />
	<span>s</span>
	<form method="POST" action="?/clear" class="ml-auto">
		<button class="btn btn-red" type="submit">Clear buffer</button>
	</form>
</div>

<p class="text-sm my-1">Showing {filtered.length} / {data.lines.length} lines</p>

<pre
	class="whitespace-pre-wrap break-all text-xs border border-gray-300 p-2 rounded bg-gray-50"
	style="max-height: 70vh; overflow: auto">{#each filtered as l}<span
			class:text-red-700={l.stream === 'stderr'}
			class:text-gray-700={l.stream === 'stdout'}>{l.at} [{l.stream}] {l.text}</span
		>{'\n'}{/each}</pre>
