<script lang="ts">
	import { languageNames, locales } from '$lib/translations';

	export let data;

	let languages = data.locales;
</script>

<h1 class="text-3xl">Languages</h1>

<form class="contents" method="post" action="?/languages">
	<p class="text-lg">Languages available (select at least one)</p>
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
		Default language when no language matches the user's preference
		<select class="form-input" name="defaultLanguage" value={data.defaultLanguage} required>
			{#each languages as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>

	<p>
		You can show/hide the language selector <a
			href="{data.adminPrefix}/config#disableLanguageSelector"
			class="underline"
		>
			here
		</a>
	</p>

	<button class="btn btn-black self-start">Save</button>
</form>

<h2 class="text-2xl">Custom Translation Keys</h2>

<form class="contents" method="post" action="?/custom">
	{#each data.customTranslationKeys as d}
		<label class="form-label">
			Custom translation keys - {d.locale}
			<textarea
				class="form-input"
				name={d.locale}
				cols="30"
				rows="10"
				value={JSON.stringify(d.keys, null, 2)}
			/>
		</label>
	{/each}

	<button class="btn btn-black self-start">Save</button>
</form>
