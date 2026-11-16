<script lang="ts">
	import FiatCurrencySelect from '$lib/components/psp-forms/FiatCurrencySelect.svelte';
	import { useI18n } from '$lib/i18n';
	import type { Front } from './front';
	import type { ConfigFields } from './types';

	export let fields: ConfigFields;
	export let texts: NonNullable<Front['settings']>['fields'];
	export let config: Record<string, unknown>;

	const { tInline } = useI18n();
</script>

{#each Object.entries(fields) as [name, field]}
	{#if field.kind === 'currency'}
		<FiatCurrencySelect {name} label={tInline(texts[name].label)} value={String(config[name])} />
	{:else}
		<label class="form-label">
			{tInline(texts[name].label)}
			<input
				class="form-input"
				type={field.kind === 'secret' ? 'password' : 'text'}
				{name}
				value={config[name]}
				placeholder={texts[name].placeholder ?? (field.prefix && `${field.prefix}...`)}
				required
			/>
		</label>
	{/if}
{/each}
