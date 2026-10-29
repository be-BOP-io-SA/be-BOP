<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.theme.title')}</h1>
<a href="{data.adminPrefix}/theme/new" class="underline">{t('admin.theme.createNew')}</a>
<a href="{data.adminPrefix}/theme/assist" class="underline">{t('admin.theme.createNewAssistant')}</a
>

<h2 class="text-2xl">{t('admin.theme.choose')}</h2>
<form method="post" class="flex flex-col gap-6">
	<label class="form-label">
		{t('admin.theme.mainTheme')}
		<select name="mainTheme" class="form-input max-w-[25rem]" bind:value={data.themeId}>
			<option value="">{t('admin.theme.defaultTheme')}</option>
			{#each data.themes as theme}
				<option value={theme._id}>{theme.name}</option>
			{/each}
		</select>
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			id="hideThemeSelectorInToolbar"
			name="hideThemeSelectorInToolbar"
			class="form-checkbox"
			checked={data.hideThemeSelectorInToolbar}
		/>
		{t('admin.theme.hideSelector')}
	</label>
	<input type="submit" value={t('admin.action.update')} class="btn btn-blue self-start" />
</form>

{#if data.themes.length}
	<h2 class="text-2xl">{t('admin.theme.listTitle')}</h2>
	{#each data.themes as theme}
		<a href="{data.adminPrefix}/theme/{theme._id}" class="font-semibold underline">{theme.name}</a>
	{/each}
{/if}
