<script lang="ts">
	import type { ThemeData } from '$lib/server/theme';
	import { themeFormStructure, systemFonts } from '$lib/types/Theme';
	import { get } from '$lib/utils/get';
	import { useI18n } from '$lib/i18n';

	const { t, te } = useI18n();

	export let theme: ThemeData | null = null;
	function getValueForKey(key: string) {
		return get(theme, key);
	}

	// Section/field labels are i18n'd by deriving a key from the (English) source string, same
	// pattern as the admin nav (see admin/+layout.svelte navKey/navLabel/navSection).
	function slugify(source: string): string {
		return source
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}
	function themeSectionLabel(label: string): string {
		const key = `admin.theme.section.${slugify(label)}`;
		return te(key) ? t(key) : label;
	}
	function themeFieldLabel(label: string): string {
		const key = `admin.theme.field.${slugify(label)}`;
		return te(key) ? t(key) : label;
	}
</script>

<label class="form-label max-w-7xl">
	{t('admin.theme.nameLabel')}
	<input class="form-input" type="text" name="name" value={theme?.name ?? ''} required />
</label>
{#each Object.entries(themeFormStructure) as [section, fields]}
	<h2 class="text-2xl">{themeSectionLabel(fields.label)}</h2>
	{#each fields.elements as field}
		{@const key = `${section}.${field.name}`}
		{#if key.endsWith('color') || key.endsWith('Color')}
			<div class="flex gap-2 max-w-7xl">
				<label class="form-label grow">
					{themeFieldLabel(field.label)} ({t('admin.theme.light')})
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
					{themeFieldLabel(field.label)} ({t('admin.theme.dark')})
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
				{themeFieldLabel(field.label)}
				<select class="form-input" name={key} required value={getValueForKey(key) ?? 'Outfit'}>
					{#each systemFonts as font}
						<option value={font}>{font}</option>
					{/each}
				</select>
			</label>
		{/if}
	{/each}
{/each}
