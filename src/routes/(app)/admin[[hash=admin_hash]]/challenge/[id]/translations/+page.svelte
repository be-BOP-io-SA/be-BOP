<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	let language: LanguageKey = 'fr';
</script>

<form method="post" class="contents">
	<label class="form-label">
		{t('admin.challenge.selectLanguage')}

		<select bind:value={language} name="language" class="form-input">
			{#each data.locales as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		{t('admin.challenge.challengeName')}
		<input
			type="text"
			name="name"
			class="form-input"
			placeholder={data.challenge.name}
			value={data.challenge.translations?.[language]?.name ?? ''}
		/>
	</label>

	<button class="btn btn-black self-start" type="submit">{t('admin.action.save')}</button>
</form>
