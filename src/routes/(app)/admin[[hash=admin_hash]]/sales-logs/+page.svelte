<script lang="ts">
	import { useI18n } from '$lib/i18n.js';

	export let data;

	const { locale } = useI18n();

	$: fromStr = data.from.toISOString().slice(0, 16);
	$: toStr = data.to.toISOString().slice(0, 16);

	$: exportParams = `from=${data.from.toISOString()}&to=${data.to.toISOString()}`;
</script>

<h1 class="text-2xl font-semibold mb-4">Sales Logs (NF525)</h1>

<form method="GET" class="flex flex-wrap gap-4 items-end mb-6">
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1" for="from">From</label>
		<input type="datetime-local" name="from" id="from" value={fromStr} class="form-input text-sm" />
	</div>
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1" for="to">To</label>
		<input type="datetime-local" name="to" id="to" value={toStr} class="form-input text-sm" />
	</div>
	<button type="submit" class="btn btn-blue text-sm px-4 py-2">Filter</button>
</form>

<div class="flex items-center justify-between mb-4">
	<p class="text-sm text-gray-600">
		Showing {data.logs.length}{data.totalCount > 500 ? ` of ${data.totalCount}` : ''} entries
	</p>
	<div class="flex gap-2">
		<a
			href="./sales-logs/accounting-log?format=csv&{exportParams}"
			class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
			download
		>
			📊 CSV
		</a>
		<a
			href="./sales-logs/accounting-log?format=json&{exportParams}"
			class="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border text-gray-700 transition-colors"
			download
		>
			📋 JSON
		</a>
	</div>
</div>

{#if data.logs.length}
	<div class="overflow-x-auto">
		<table class="min-w-full table-auto border border-gray-300 bg-white text-sm">
			<thead class="bg-gray-200">
				<tr class="whitespace-nowrap">
					<th class="border border-gray-300 px-3 py-2 text-left">Date</th>
					<th class="border border-gray-300 px-3 py-2 text-left">Event</th>
					<th class="border border-gray-300 px-3 py-2 text-left">Object</th>
					<th class="border border-gray-300 px-3 py-2 text-left">Type</th>
					<th class="border border-gray-300 px-3 py-2 text-left">Before</th>
					<th class="border border-gray-300 px-3 py-2 text-left">After</th>
					<th class="border border-gray-300 px-3 py-2 text-left">Employee</th>
				</tr>
			</thead>
			<tbody>
				{#each data.logs as log}
					<tr class="hover:bg-gray-50">
						<td class="border border-gray-300 px-3 py-2 whitespace-nowrap">
							<time
								datetime={log.createdAt.toISOString()}
								title={log.createdAt.toLocaleString($locale)}
							>
								{log.createdAt.toLocaleString($locale)}
							</time>
						</td>
						<td class="border border-gray-300 px-3 py-2">
							<span
								class="inline-block px-2 py-0.5 rounded text-xs font-medium"
								class:bg-blue-100={log.eventType.startsWith('vat')}
								class:text-blue-800={log.eventType.startsWith('vat')}
								class:bg-green-100={log.eventType.startsWith('payment')}
								class:text-green-800={log.eventType.startsWith('payment')}
								class:bg-orange-100={log.eventType.startsWith('product')}
								class:text-orange-800={log.eventType.startsWith('product')}
								class:bg-purple-100={log.eventType.startsWith('stock')}
								class:text-purple-800={log.eventType.startsWith('stock')}
							>
								{log.eventType}
							</span>
						</td>
						<td class="border border-gray-300 px-3 py-2 font-mono text-xs max-w-[200px] truncate">
							{log.objectId}
						</td>
						<td class="border border-gray-300 px-3 py-2">{log.objectType}</td>
						<td
							class="border border-gray-300 px-3 py-2 font-mono text-xs max-w-[200px] truncate"
							title={JSON.stringify(log.before)}
						>
							{JSON.stringify(log.before ?? null)}
						</td>
						<td
							class="border border-gray-300 px-3 py-2 font-mono text-xs max-w-[200px] truncate"
							title={JSON.stringify(log.after)}
						>
							{JSON.stringify(log.after ?? null)}
						</td>
						<td class="border border-gray-300 px-3 py-2">
							{log.employee?.alias ?? '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<p class="text-gray-500 text-center py-8">No entries found for the selected period.</p>
{/if}
