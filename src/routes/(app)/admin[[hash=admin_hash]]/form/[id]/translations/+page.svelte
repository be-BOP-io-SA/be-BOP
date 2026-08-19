<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { useI18n } from '$lib/i18n';

	export let data;

	let language: LanguageKey = 'fr';

	const { t } = useI18n();
</script>

<form method="post" class="contents">
	<label class="form-label">
		{t('admin.form.selectLanguage')}

		<select bind:value={language} name="language" class="form-input">
			{#each data.locales as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>
	{#if data.contactForm.disclaimer}
		<label class="form-label">
			{t('admin.form.disclaimerLabel')}
			<input
				class="form-input block"
				type="text"
				name="disclaimer.label"
				placeholder={data.contactForm.disclaimer?.label}
				required
				value={data.contactForm.translations?.[language]?.disclaimer?.label ?? ''}
			/>
		</label>
		{t('admin.form.disclaimerContent')}
		<label class="form-label">
			<textarea
				name="disclaimer.content"
				cols="30"
				rows="5"
				maxlength={MAX_CONTENT_LIMIT}
				placeholder={data.contactForm.disclaimer?.content}
				class="form-input block w-full"
				value={data.contactForm.translations?.[language]?.disclaimer?.content ?? ''}
			/>
		</label>
		<label class="form-label">
			{t('admin.form.disclaimerCheckboxLabel')}
			<input
				class="form-input block"
				type="text"
				name="disclaimer.checkboxLabel"
				placeholder={data.contactForm.disclaimer?.checkboxLabel}
				required
				value={data.contactForm.translations?.[language]?.disclaimer?.checkboxLabel ?? ''}
			/>
		</label>
	{/if}
	<label class="form-label">
		{t('admin.form.subject')}
		<input
			class="form-input block"
			type="text"
			name="subject"
			placeholder={data.contactForm.subject}
			value={data.contactForm.translations?.[language]?.subject ?? ''}
		/>
	</label>
	{t('admin.form.content')}

	<textarea
		name="content"
		cols="30"
		rows="10"
		maxlength={MAX_CONTENT_LIMIT}
		value={data.contactForm.translations?.[language]?.content ?? ''}
		placeholder={data.contactForm.content}
		class="form-input block w-full"
	/>

	<button class="btn btn-black self-start" type="submit">{t('admin.action.save')}</button>
</form>
