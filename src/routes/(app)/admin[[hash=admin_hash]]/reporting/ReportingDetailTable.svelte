<script lang="ts" generics="Row">
	import type { ReportingColumn } from './reportingColumns';

	export let columns: ReportingColumn<Row>[];
	export let rows: Row[];
</script>

<div class="overflow-x-auto max-h-[500px]">
	<table class="min-w-full table-auto border border-gray-300 bg-white">
		<thead class="bg-gray-200">
			<tr class="whitespace-nowrap">
				{#each columns as column}
					<th class="border border-gray-300 px-4 py-2">{column.header}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row}
				<tr class="hover:bg-gray-100 whitespace-nowrap">
					{#each columns as column}
						<td class="border border-gray-300 px-4 py-2" title={column.title?.(row)}>
							{#if column.href}
								<a href={column.href(row)} target="_blank" class="underline body-hyperlink"
									>{column.cell(row) ?? ''}</a
								>
							{:else}
								{column.cell(row) ?? ''}
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
