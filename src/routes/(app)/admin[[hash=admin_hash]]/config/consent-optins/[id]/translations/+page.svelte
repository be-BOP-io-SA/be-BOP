<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations';
	import { useI18n } from '$lib/i18n';

	export let data;

	let language: LanguageKey = data.locales.includes('fr') ? 'fr' : data.locales[0];

	const { t } = useI18n();
</script>

<a href="{data.adminPrefix}/config/consent-optins" class="underline">
	{t('admin.consentOptins.backToList')}
</a>

<h1 class="text-3xl">{t('admin.consentOptins.translationsTitle', { label: data.optin.label })}</h1>

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
		{t('admin.consentOptins.labelField')}
		{#key language}
			<input
				class="form-input block"
				type="text"
				name="label"
				placeholder={data.optin.label}
				value={data.optin.translations[language]?.label ?? ''}
			/>
		{/key}
	</label>

	<button class="btn btn-black self-start" type="submit">{t('admin.action.save')}</button>
</form>
