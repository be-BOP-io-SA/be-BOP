<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';

	export let data;

	let language: LanguageKey = 'fr';
	let errorMessage = '';
	let savedNotice = '';

	type LinkRow = { label: string; href: string; isTranslated: boolean };
	// Render one row per entry configured in the main config (strict 1:1) — no add / no delete.
	// Translated entries that go beyond main are ignored on display and dropped on the next save.
	function buildRows(
		main: ReadonlyArray<{ label: string; href: string }> | undefined,
		translated: ReadonlyArray<{ label: string; href: string }> | undefined
	): LinkRow[] {
		const count = main?.length ?? 0;
		return Array.from({ length: count }, (_, i) => {
			const t = translated?.[i];
			return t
				? { label: t.label, href: t.href, isTranslated: true }
				: { label: '', href: '', isTranslated: false };
		});
	}
	$: topbarRows = buildRows(data.defaultConfig.topbarLinks, data.config?.[language]?.topbarLinks);
	$: navbarRows = buildRows(data.defaultConfig.navbarLinks, data.config?.[language]?.navbarLinks);
	$: footerRows = buildRows(data.defaultConfig.footerLinks, data.config?.[language]?.footerLinks);
</script>

<form
	method="post"
	class="contents"
	use:enhance={() => {
		errorMessage = '';
		savedNotice = '';
		return async ({ result }) => {
			if (result.type === 'failure') {
				errorMessage =
					(result.data?.errorMessage as string | undefined) ?? 'Save failed.';
				return;
			}
			if (result.type === 'success') {
				savedNotice = 'Saved.';
				await invalidateAll();
				return;
			}
			await applyAction(result);
		};
	}}
>
	{#if errorMessage}
		<p class="alert-error" role="alert">{errorMessage}</p>
	{/if}
	{#if savedNotice}
		<p class="alert-success" role="status">{savedNotice}</p>
	{/if}
	<label class="form-label">
		Select Language

		<select bind:value={language} name="language" class="form-input">
			{#each data.locales as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		Brand name
		<input
			type="text"
			name="brandName"
			class="form-input"
			placeholder={data.defaultConfig.brandName}
			value={data.config?.[language]?.brandName ?? ''}
		/>
	</label>

	<label class="form-label">
		Website title
		<input
			type="text"
			name="websiteTitle"
			class="form-input"
			placeholder={data.defaultConfig.websiteTitle}
			value={data.config?.[language]?.websiteTitle ?? ''}
		/>
	</label>

	<label class="form-label">
		Website description

		<textarea
			name="websiteShortDescription"
			class="form-input"
			rows="2"
			cols="30"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			placeholder={data.defaultConfig.websiteShortDescription}
			>{data.config?.[language]?.websiteShortDescription ?? ''}</textarea
		>
	</label>

	<h2 class="text-2xl">Top bar links</h2>

	{#each topbarRows as row, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="topbarLinks[{i}].label"
					placeholder={data.defaultConfig.topbarLinks[i]?.label ?? ''}
					class="form-input"
					value={row.label}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="topbarLinks[{i}].href"
					class="form-input"
					placeholder={data.defaultConfig.topbarLinks[i]?.href ?? ''}
					value={row.isTranslated ? row.href : data.defaultConfig.topbarLinks[i]?.href ?? ''}
				/>
			</label>
		</div>
	{/each}

	<h2 class="text-2xl">Nav bar links</h2>

	{#each navbarRows as row, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="navbarLinks[{i}].label"
					class="form-input"
					value={row.label}
					placeholder={data.defaultConfig.navbarLinks[i]?.label ?? ''}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="navbarLinks[{i}].href"
					class="form-input"
					value={row.isTranslated ? row.href : data.defaultConfig.navbarLinks[i]?.href ?? ''}
					placeholder={data.defaultConfig.navbarLinks[i]?.href ?? ''}
				/>
			</label>
		</div>
	{/each}

	<h2 class="text-2xl">Footer links</h2>

	{#each footerRows as row, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="footerLinks[{i}].label"
					class="form-input"
					value={row.label}
					placeholder={data.defaultConfig.footerLinks[i]?.label ?? ''}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="footerLinks[{i}].href"
					class="form-input"
					value={row.isTranslated ? row.href : data.defaultConfig.footerLinks[i]?.href ?? ''}
					placeholder={data.defaultConfig.footerLinks[i]?.href ?? ''}
				/>
			</label>
		</div>
	{/each}

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
