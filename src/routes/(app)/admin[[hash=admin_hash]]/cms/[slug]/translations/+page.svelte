<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product.js';

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
		<input
			type="text"
			name="title"
			class="form-input"
			placeholder={data.cmsPage.title}
			value={data.cmsPage.translations?.[language]?.title ?? ''}
		/>
	</label>

	<label class="form-label">
		Content
		<textarea
			name="content"
			class="form-input"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder={data.cmsPage.content}
			value={data.cmsPage.translations?.[language]?.content ?? ''}
		/>
	</label>
	<label class="form-label">
		Substitution content
		<textarea
			name="mobileContent"
			class="form-input"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder={data.cmsPage.mobileContent}
			value={data.cmsPage.translations?.[language]?.mobileContent ?? ''}
		/>
	</label>
	<label class="form-label">
		Employee content
		<textarea
			name="employeeContent"
			class="form-input"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder={data.cmsPage.employeeContent}
			value={data.cmsPage.translations?.[language]?.employeeContent ?? ''}
		/>
	</label>

	<label class="form-label">
		Short Description
		<textarea
			name="shortDescription"
			class="form-input"
			rows="2"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			placeholder={data.cmsPage.shortDescription}
			value={data.cmsPage.translations?.[language]?.shortDescription ?? ''}
		/>
	</label>

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
