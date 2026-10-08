<script lang="ts" generics="Row">
	import type { ReportingColumn } from './reportingColumns';

	export let columns: ReportingColumn<Row>[];
	export let rows: Row[];
</script>

<div class="overflow-x-auto max-h-[500px]">
	<!-- Cell styles live on the table: repeated on every cell they made up a third of the page. -->
	<table
		class="min-w-full table-auto border border-gray-300 bg-white [&_td]:border [&_td]:border-gray-300 [&_td]:px-4 [&_td]:py-2 [&_th]:border [&_th]:border-gray-300 [&_th]:px-4 [&_th]:py-2 [&_tr]:whitespace-nowrap [&_tbody_tr:hover]:bg-gray-100"
	>
		<thead class="bg-gray-200">
			<tr>
				{#each columns as column}
					<th>{column.header}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row}
				<tr>
					{#each columns as column}
						<td title={column.title?.(row)}>
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
