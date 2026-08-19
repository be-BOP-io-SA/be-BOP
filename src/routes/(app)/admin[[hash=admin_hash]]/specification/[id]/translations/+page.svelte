<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	let language: LanguageKey = 'fr';
</script>

<form method="post" class="contents">
	<label class="form-label">
		{t('admin.specification.selectLanguage')}

		<select bind:value={language} name="language" class="form-input">
			{#each data.locales as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		{t('admin.specification.title')}
		<input
			type="text"
			name="title"
			class="form-input"
			maxlength={MAX_NAME_LIMIT}
			placeholder={data.specification.title}
			value={data.specification.translations?.[language]?.title ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.specification.content')}
		<textarea
			name="content"
			class="form-input"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder={data.specification.content}
			value={data.specification.translations?.[language]?.content ?? ''}
		/>
	</label>

	<button class="btn btn-black self-start" type="submit">{t('admin.action.save')}</button>
</form>
