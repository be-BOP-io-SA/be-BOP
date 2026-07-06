<script lang="ts">
	import { languageNames, locales } from '$lib/translations';
	import { useI18n } from '$lib/i18n';

	export let data;

	let languages = data.locales;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.language.title')}</h1>

<form class="contents" method="post" action="?/languages">
	<p class="text-lg">{t('admin.language.availableLanguages')}</p>
	<ul>
		{#each locales as locale}
			<li>
				<label class="checkbox-label">
					<input
						type="checkbox"
						class="form-checkbox"
						name="languages"
						value={locale}
						bind:group={languages}
					/>
					{languageNames[locale]}
				</label>
			</li>
		{/each}
	</ul>

	<label class="form-label">
		{t('admin.language.defaultLanguageLabel')}
		<select class="form-input" name="defaultLanguage" value={data.defaultLanguage} required>
			{#each languages as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>

	<p>
		{t('admin.language.showHideSelectorPrefix')}
		<a href="{data.adminPrefix}/config#disableLanguageSelector" class="body-hyperlink">
			{t('admin.language.here')}
		</a>
	</p>

	<button class="btn btn-black self-start">{t('admin.action.save')}</button>
</form>

<h2 class="text-2xl">{t('admin.language.customTranslationKeys')}</h2>

<form class="contents" method="post" action="?/custom">
	{#each data.customTranslationKeys as d}
		<label class="form-label">
			{t('admin.language.customTranslationKeysFor', { locale: d.locale })}
			<textarea
				class="form-input"
				name={d.locale}
				cols="30"
				rows="10"
				value={JSON.stringify(d.keys, null, 2)}
			/>
		</label>
	{/each}

	<button class="btn btn-black self-start">{t('admin.action.save')}</button>
</form>
