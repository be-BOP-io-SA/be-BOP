<script lang="ts">
	import type { ThemeData } from '$lib/server/theme';
	import { themeFormStructure, systemFonts } from '$lib/types/Theme';
	import { get } from '$lib/utils/get';

	export let theme: ThemeData | null = null;
	function getValueForKey(key: string) {
		return get(theme, key);
	}
</script>

<label class="form-label max-w-7xl">
	Theme name
	<input class="form-input" type="text" name="name" value={theme?.name ?? ''} required />
</label>
{#each Object.entries(themeFormStructure) as [section, fields]}
	<h2 class="text-2xl">{fields.label}</h2>
	{#each fields.elements as field}
		{@const key = `${section}.${field.name}`}
		{#if key.endsWith('color') || key.endsWith('Color')}
			<div class="flex gap-2 max-w-7xl">
				<label class="form-label grow">
					{field.label} (light)
					<input
						class="form-input"
						type="color"
						name="{key}.light"
						required
						value={getValueForKey(`${key}.light`) ??
							(key.endsWith('backgroundColor') ? '#FFFFFF' : '#000000')}
					/>
				</label>
				<label class="form-label grow">
					{field.label} (dark)
					<input
						class="form-input"
						type="color"
						name="{key}.dark"
						required
						value={getValueForKey(`${key}.dark`) ??
							(!key.endsWith('backgroundColor') ? '#FFFFFF' : '#000000')}
					/>
				</label>
			</div>
		{:else}
			<label class="form-label max-w-7xl">
				{field.label}
				<select class="form-input" name={key} required value={getValueForKey(key) ?? 'Outfit'}>
					{#each systemFonts as font}
						<option value={font}>{font}</option>
					{/each}
				</select>
			</label>
		{/if}
	{/each}
{/each}
