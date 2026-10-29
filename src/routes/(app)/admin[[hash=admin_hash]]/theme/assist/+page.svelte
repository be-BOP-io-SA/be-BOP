<script lang="ts">
	import { systemFonts } from '$lib/types/Theme';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.theme.createNewAssistant')}</h1>

<form method="post" class="flex flex-col gap-6 max-w-lg">
	<label class="form-label">
		{t('admin.theme.nameLabel')}
		<input class="form-input" type="text" name="name" required />
	</label>

	<label class="form-label">
		{t('admin.theme.assistPrimaryColor')}
		<input class="form-input" type="color" name="primaryColor" value="#00470b" required />
	</label>

	<label class="form-label">
		{t('admin.theme.assistSecondaryColor')}
		<input class="form-input" type="color" name="secondaryColor" value="#240000" required />
	</label>

	<label class="form-label">
		{t('admin.theme.assistMainFont')}
		<select class="form-input" name="mainFont" required>
			{#each systemFonts as font}
				<option value={font}>{font}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		{t('admin.theme.assistSecondaryFont')}
		<select class="form-input" name="secondaryFont">
			<option value="">{t('admin.theme.assistSameAsMainFont')}</option>
			{#each systemFonts as font}
				<option value={font}>{font}</option>
			{/each}
		</select>
	</label>

	<input type="submit" class="btn btn-blue self-start" value={t('admin.theme.assistGenerate')} />
</form>
