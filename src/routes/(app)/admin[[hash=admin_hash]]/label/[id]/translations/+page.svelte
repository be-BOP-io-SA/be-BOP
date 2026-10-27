<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { useI18n } from '$lib/i18n';

	export let data;

	let language: LanguageKey = 'fr';

	const { t } = useI18n();
</script>

<form method="post" class="contents">
	<label class="form-label">
		{t('admin.label.selectLanguage')}

		<select bind:value={language} name="language" class="form-input">
			{#each data.locales as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		{t('admin.label.name')}
		<input
			class="form-input block"
			type="text"
			name="name"
			placeholder={data.label.name}
			value={data.label.translations?.[language]?.name ?? ''}
		/>
	</label>

	<button class="btn btn-black self-start" type="submit">{t('admin.action.save')}</button>
</form>
