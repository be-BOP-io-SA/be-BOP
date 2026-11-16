<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import type { Front } from './front';
	import type { ConfigFields } from './types';

	export let fields: ConfigFields;
	export let texts: NonNullable<Front['settings']>['fields'];
	export let config: Record<string, unknown>;

	const { tInline } = useI18n();
</script>

{#each Object.entries(fields) as [name, field]}
	<label class="form-label">
		{tInline(texts[name].label)}
		<input
			class="form-input"
			type={field.kind === 'secret' ? 'password' : 'text'}
			{name}
			value={config[name]}
			required
		/>
	</label>
{/each}
