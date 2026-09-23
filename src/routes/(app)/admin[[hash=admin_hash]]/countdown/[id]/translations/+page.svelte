<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';

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

	<label class="form-label">
		Title
		<textarea
			name="title"
			class="form-input"
			rows="10"
			cols="3"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			placeholder={data.countdown.title}
			value={data.countdown.translations?.[language]?.title ?? ''}
		></textarea>
	</label>
	<label class="form-label">
		Description
		<textarea
			name="description"
			class="form-input"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder={data.countdown.description}
			value={data.countdown.translations?.[language]?.description ?? ''}
		></textarea>
	</label>

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
