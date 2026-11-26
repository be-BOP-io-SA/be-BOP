<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import FiatCurrencySelect from './FiatCurrencySelect.svelte';
	import type { SettingsTexts } from './front';
	import type { ConfigFields } from './types';

	export let fields: ConfigFields;
	export let settings: SettingsTexts;
	export let config: Record<string, unknown>;

	const { tInline } = useI18n();
</script>

{#each Object.entries(fields) as [name, field]}
	{@const texts = settings.fields[name]}
	{#if field.kind === 'currency'}
		<FiatCurrencySelect {name} label={tInline(texts.label)} value={String(config[name])} />
	{:else if field.kind === 'boolean'}
		<label class="checkbox-label">
			<input class="form-checkbox" type="checkbox" {name} checked={!!config[name]} value="true" />
			{tInline(texts.label)}
		</label>
	{:else}
		<label class="form-label">
			{tInline(texts.label)}
			<input
				class="form-input"
				type={field.kind === 'secret' ? 'password' : 'text'}
				{name}
				value={config[name]}
				placeholder={texts.placeholder ?? (field.prefix && `${field.prefix}...`)}
				required={!field.optional}
			/>
		</label>
	{/if}
{/each}

{#if settings.outro}
	<p class="text-sm text-gray-500">{tInline(settings.outro)}</p>
{/if}
