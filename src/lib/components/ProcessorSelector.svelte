<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

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
			{t('admin.processorSelector.noProcessorsConfigured')}
			{#each configLinks as link, i}
				{#if i > 0}{i === configLinks.length - 1
						? ` ${t('admin.processorSelector.or')} `
						: ', '}{/if}<a href={link.href} class="underline">{link.name}</a>
			{/each}.
		</p>
	</div>
{:else}
	<label class="form-label">
		{label}
		<select {name} class="form-input max-w-[25rem]" bind:value={selectedProcessor}>
			<option value="">{t('admin.processorSelector.autoSystemPriority')}</option>
			{#if showPreferredWarning}
				<option value={preferredProcessor} class="text-orange-600">
					⚠ {preferredProcessor} ({t('admin.processorSelector.notConfigured')})
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
				{t('admin.processorSelector.priority')}: {#if isNotConfigured}<del>{selectedProcessor}</del
					>{:else}{selectedProcessor}{/if}{#if others.length}
					→ {others.join(' → ')}{/if}
			{:else}
				{t('admin.processorSelector.systemPriority')}: {availableProcessors.join(' → ')}
			{/if}
		</span>
	</label>
{/if}
