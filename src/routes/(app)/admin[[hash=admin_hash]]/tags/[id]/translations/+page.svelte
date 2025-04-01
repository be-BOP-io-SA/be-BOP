<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations';

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
			placeholder={data.tag.title}
			value={data.tag.translations?.[language]?.title ?? ''}
		/>
	</label>

	<label class="form-label">
		Subtitle
		<input
			type="text"
			name="subtitle"
			class="form-input"
			placeholder={data.tag.subtitle}
			value={data.tag.translations?.[language]?.subtitle ?? ''}
		/>
	</label>

	<label class="form-label">
		Short content
		<textarea
			name="shortContent"
			cols="30"
			rows="2"
			class="form-input"
			value={data.tag.translations?.[language]?.shortContent ?? ''}
		/>
	</label>

	<label class="form-label">
		Full content

		<textarea
			name="content"
			class="form-input"
			rows="10"
			cols="30"
			maxlength="10000"
			placeholder={data.tag.content}
			value={data.tag.translations?.[language]?.content ?? ''}
		/>
	</label>

	<h3 class="text-xl">CTAs</h3>
	{#each [0, 1, 2] as i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="cta[{i}].label"
					class="form-input"
					value={data.tag.translations?.[language]?.cta?.[i]?.label ?? data.tag.cta[i]?.label ?? ''}
					placeholder={data.tag.cta[i]?.label || ''}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="cta[{i}].href"
					class="form-input"
					value={data.tag.translations?.[language]?.cta?.[i]?.href ?? data.tag.cta[i]?.href ?? ''}
					placeholder={data.tag.cta[i]?.href || ''}
				/>
			</label>
			<label class="checkbox-label mt-4">
				<input
					class="form-checkbox"
					type="checkbox"
					name="cta[{i}].openNewTab"
					checked={data.tag.translations?.[language]?.cta?.[i]?.openNewTab ??
						data.tag.cta[i]?.openNewTab}
				/>
				Open in new tab
			</label>
		</div>
	{/each}

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
