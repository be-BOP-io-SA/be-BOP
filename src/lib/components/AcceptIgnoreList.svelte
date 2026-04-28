<script lang="ts">
	/**
	 * Reusable accept/ignore list for "proposed changes" UIs.
	 *
	 * Renders a table with one row per item: label, current value, proposed
	 * value, and a checkbox. The component is purely presentational and
	 * doesn't submit on its own — wrap it in a `<form method="post">` and
	 * provide your own submit button. Each accepted item submits an
	 * `accepted` form field with the item's `key` as value.
	 *
	 * Designed to be reused beyond migration (e.g. for #2481, the runtime
	 * config defaults acceptance UI).
	 */
	export let items: Array<{
		key: string;
		label: string;
		currentValue: unknown;
		proposedValue: unknown;
		disabledReason?: string;
	}>;
	/** Pre-checked state per key. Items not listed default to checked unless disabled. */
	export let initialChecked: Record<string, boolean> = {};

	function fmt(value: unknown): string {
		if (value === null || value === undefined || value === '') return '—';
		if (typeof value === 'string') return value;
		return JSON.stringify(value);
	}
</script>

<table class="w-full">
	<thead>
		<tr>
			<th class="text-left">Apply</th>
			<th class="text-left">Field</th>
			<th class="text-left">Current value</th>
			<th class="text-left">Proposed value</th>
		</tr>
	</thead>
	<tbody>
		{#each items as item (item.key)}
			<tr class="border-b align-top">
				<td class="py-2">
					<input
						type="checkbox"
						class="form-checkbox"
						name="accepted"
						value={item.key}
						checked={!item.disabledReason && (initialChecked[item.key] ?? true)}
						disabled={!!item.disabledReason}
					/>
				</td>
				<td class="py-2 font-semibold">
					{item.label}
					{#if item.disabledReason}
						<div class="text-xs text-red-500 font-normal">{item.disabledReason}</div>
					{/if}
				</td>
				<td class="py-2 text-sm font-mono break-words">{fmt(item.currentValue)}</td>
				<td class="py-2 text-sm font-mono break-words">{fmt(item.proposedValue)}</td>
			</tr>
		{/each}
	</tbody>
</table>
