<script lang="ts">
	export let label: string;
	export let name: string;
	export let availableProcessors: readonly string[];
	export let selectedProcessor: string | undefined;
	export let preferredProcessor: string | undefined;
	export let configLinks: Array<{ href: string; name: string }>;

	$: isNotConfigured = selectedProcessor && !availableProcessors.includes(selectedProcessor);
	$: showPreferredWarning = preferredProcessor && !availableProcessors.includes(preferredProcessor);
</script>

{#if availableProcessors.length === 0}
	<div class="form-label">
		<div>{label}</div>
		<p class="text-sm text-gray-500">
			No processors configured. Configure them in the Payment Settings tab above
			{#each configLinks as link, i}
				{#if i > 0}{i === configLinks.length - 1 ? ', or ' : ', '}{/if}<a
					href={link.href}
					class="underline">{link.name}</a
				>
			{/each}.
		</p>
	</div>
{:else}
	<label class="form-label">
		{label}
		<select {name} class="form-input max-w-[25rem]" bind:value={selectedProcessor}>
			<option value="">Auto (system priority)</option>
			{#if showPreferredWarning}
				<option value={preferredProcessor} class="text-orange-600">
					⚠ {preferredProcessor} (not configured)
				</option>
			{/if}
			{#each availableProcessors as processor}
				<option value={processor}>
					{processor}
				</option>
			{/each}
		</select>
		<span class="text-sm text-gray-500">
			{#if selectedProcessor}
				{@const others = availableProcessors.filter((p) => p !== selectedProcessor)}
				Priority: {#if isNotConfigured}<del>{selectedProcessor}</del
					>{:else}{selectedProcessor}{/if}{#if others.length}
					→ {others.join(' → ')}{/if}
			{:else}
				System priority: {availableProcessors.join(' → ')}
			{/if}
		</span>
	</label>
{/if}
