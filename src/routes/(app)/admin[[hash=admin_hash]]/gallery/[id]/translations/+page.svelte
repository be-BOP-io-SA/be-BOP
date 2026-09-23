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

	<h3 class="text-xl">Principal Gallery</h3>
	<label class="form-label">
		Gallery title
		<input
			class="form-input"
			type="text"
			name="principal.title"
			placeholder={data.gallery.principal.title}
			value={data.gallery.translations?.[language]?.principal?.title ?? ''}
		/>
	</label>
	<label class="form-label">
		Gallery content
		<textarea
			name="principal.content"
			placeholder={data.gallery.principal.content}
			value={data.gallery.translations?.[language]?.principal?.content ?? ''}
			cols="30"
			rows="5"
			maxlength="10000"
			class="form-input"
		></textarea>
	</label>
	<div class="flex gap-4">
		<label class="form-label">
			Text
			<input
				type="text"
				name="principal.cta.label"
				class="form-input"
				placeholder={data.gallery.principal.cta.label}
				value={data.gallery.principal.cta.label ??
					data.gallery.translations?.[language]?.principal?.cta?.label ??
					''}
			/>
		</label>
		<label class="form-label">
			Url
			<input
				type="text"
				name="principal.cta.href"
				class="form-input"
				placeholder={data.gallery.principal.cta.href}
				value={data.gallery.principal.cta.href ??
					data.gallery.translations?.[language]?.principal?.cta?.href ??
					''}
			/>
		</label>
		<label class="checkbox-label mt-4">
			<input
				class="form-checkbox"
				type="checkbox"
				name="principal.cta.openNewTab"
				checked={data.gallery.principal.cta.openNewTab ??
					data.gallery.translations?.[language]?.principal?.cta?.openNewTab}
			/>
			Open in new tab
		</label>
	</div>

	<h3 class="text-xl">Secondary Gallery</h3>
	{#each [0, 1, 2] as i}
		<label class="form-label">
			Gallery subtitle {i + 1}
			<input
				class="form-input"
				type="text"
				name="secondary[{i}].title"
				maxlength="30"
				placeholder={data.gallery.secondary[i]?.title}
				value={data.gallery.translations?.[language]?.secondary?.[i]?.title || ''}
			/>
		</label>
		<label class="form-label">
			Gallery subcontent {i + 1}
			<textarea
				name="secondary[{i}].content"
				cols="30"
				rows="5"
				maxlength="160"
				class="form-input"
				placeholder={data.gallery.secondary[i]?.content}
				value={data.gallery.translations?.[language]?.secondary?.[i]?.content || ''}
			></textarea>
		</label>
		<input
			type="hidden"
			name="secondary[{i}].pictureId"
			class="form-input"
			value={data.gallery.secondary[i].pictureId || ''}
		/>

		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="secondary[{i}].cta.label"
					class="form-input"
					placeholder={data.gallery.secondary[i]?.cta.label || ''}
					value={data.gallery.secondary[i]?.cta.label ??
						data.gallery.translations?.[language]?.secondary?.[i]?.cta?.label ??
						''}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="secondary[{i}].cta.href"
					class="form-input"
					placeholder={data.gallery.secondary[i]?.cta.href || ''}
					value={data.gallery.secondary[i]?.cta.href ??
						data.gallery.translations?.[language]?.secondary?.[i]?.cta?.href ??
						''}
				/>
			</label>
			<label class="checkbox-label mt-4">
				<input
					class="form-checkbox"
					type="checkbox"
					name="secondary[{i}].cta.openNewTab"
					checked={data.gallery.secondary[i]?.cta.openNewTab ??
						data.gallery.translations?.[language]?.secondary?.[i]?.cta?.openNewTab}
				/>
				Open in new tab
			</label>
		</div>
	{/each}

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
