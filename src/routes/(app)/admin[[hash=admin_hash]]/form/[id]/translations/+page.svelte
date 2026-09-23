<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';

	export let data;

	let language: LanguageKey = 'fr';
</script>

<form method="post" class="contents">
	<label class="form-label">
		Select Language

		<select bind:value={language} name="language" class="form-input">
			{#each data.locales as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>
	{#if data.contactForm.disclaimer}
		<label class="form-label">
			Disclaimer label
			<input
				class="form-input block"
				type="text"
				name="disclaimer.label"
				placeholder={data.contactForm.disclaimer?.label}
				required
				value={data.contactForm.translations?.[language]?.disclaimer?.label ?? ''}
			/>
		</label>
		Disclaimer Content
		<label class="form-label">
			<textarea
				name="disclaimer.content"
				cols="30"
				rows="5"
				maxlength={MAX_CONTENT_LIMIT}
				placeholder={data.contactForm.disclaimer?.content}
				class="form-input block w-full"
				value={data.contactForm.translations?.[language]?.disclaimer?.content ?? ''}
			></textarea>
		</label>
		<label class="form-label">
			Disclaimer checkbox label
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
		Subject
		<input
			class="form-input block"
			type="text"
			name="subject"
			placeholder={data.contactForm.subject}
			value={data.contactForm.translations?.[language]?.subject ?? ''}
		/>
	</label>
	Content

	<textarea
		name="content"
		cols="30"
		rows="10"
		maxlength={MAX_CONTENT_LIMIT}
		value={data.contactForm.translations?.[language]?.content ?? ''}
		placeholder={data.contactForm.content}
		class="form-input block w-full"
	></textarea>

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
