<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';

	export let data;

	let language: LanguageKey = 'fr';
	let errorMessage = '';
	let savedNotice = '';

	type LinkRow = { id: string; label: string; href: string; mainLabel: string; mainHref: string };
	// One row per main-config link (strict 1:1 — links are added/removed in /admin/layout). Rows
	// are keyed by the link's stable `id`, and the override is matched by id, so reordering main
	// links never misaligns a translation. `value` holds the current translation; empty means
	// untranslated — the main label/href shows as placeholder and is the storefront fallback.
	function buildRows(
		main: ReadonlyArray<{ id: string; label: string; href: string }> | undefined,
		translated: ReadonlyArray<{ id: string; label: string; href: string }> | undefined
	): LinkRow[] {
		return (main ?? []).map((m) => {
			const t = translated?.find((x) => x.id === m.id);
			return {
				id: m.id,
				label: t?.label ?? '',
				href: t?.href ?? '',
				mainLabel: m.label,
				mainHref: m.href
			};
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
					typeof result.data?.errorMessage === 'string' ? result.data.errorMessage : 'Save failed.';
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

	<p class="text-sm text-gray-600 mt-4">
		Links themselves are managed in <a href="../layout" class="body-hyperlink underline">Layout</a>;
		here you only translate the existing labels and (optionally) override the URLs per language.
	</p>

	<h2 class="text-2xl">Top bar links</h2>

	{#each topbarRows as row, i}
		<div class="flex gap-4">
			<input type="hidden" name="topbarLinks[{i}].id" value={row.id} />
			<label class="form-label">
				Text
				<input
					type="text"
					name="topbarLinks[{i}].label"
					placeholder={row.mainLabel}
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
					placeholder={row.mainHref}
					value={row.href}
				/>
			</label>
		</div>
	{/each}

	<h2 class="text-2xl">Nav bar links</h2>

	{#each navbarRows as row, i}
		<div class="flex gap-4">
			<input type="hidden" name="navbarLinks[{i}].id" value={row.id} />
			<label class="form-label">
				Text
				<input
					type="text"
					name="navbarLinks[{i}].label"
					class="form-input"
					value={row.label}
					placeholder={row.mainLabel}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="navbarLinks[{i}].href"
					class="form-input"
					value={row.href}
					placeholder={row.mainHref}
				/>
			</label>
		</div>
	{/each}

	<h2 class="text-2xl">Footer links</h2>

	{#each footerRows as row, i}
		<div class="flex gap-4">
			<input type="hidden" name="footerLinks[{i}].id" value={row.id} />
			<label class="form-label">
				Text
				<input
					type="text"
					name="footerLinks[{i}].label"
					class="form-input"
					value={row.label}
					placeholder={row.mainLabel}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="footerLinks[{i}].href"
					class="form-input"
					value={row.href}
					placeholder={row.mainHref}
				/>
			</label>
		</div>
	{/each}

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
