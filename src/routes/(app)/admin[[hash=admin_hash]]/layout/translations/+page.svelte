<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';

	export let data;

	let language: LanguageKey = 'fr';

	type LinkRow = { label: string; href: string };
	// For each kind of link, pre-create one row per entry that exists in the main config so the
	// translator sees the original (label + href) as placeholders next to an empty input — plus
	// any translation row that exists beyond the main count, plus one trailing empty row that
	// lets the operator add a translation-only entry that has no counterpart in main.
	function buildRows(
		main: ReadonlyArray<LinkRow> | undefined,
		translated: ReadonlyArray<LinkRow> | undefined
	): LinkRow[] {
		const mainLen = main?.length ?? 0;
		const translatedLen = translated?.length ?? 0;
		const baseCount = Math.max(mainLen, translatedLen);
		const rows: LinkRow[] = [];
		for (let i = 0; i < baseCount; i++) {
			rows.push(translated?.[i] ?? { label: '', href: '' });
		}
		rows.push({ label: '', href: '' });
		return rows;
	}
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

	{#each buildRows(data.defaultConfig.topbarLinks, data.config?.[language]?.topbarLinks) as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="topbarLinks[{i}].label"
					placeholder={data.defaultConfig.topbarLinks[i]?.label ?? ''}
					class="form-input"
					value={link.label}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="topbarLinks[{i}].href"
					class="form-input"
					placeholder={data.defaultConfig.topbarLinks[i]?.href ?? ''}
					value={link.href}
				/>
			</label>
		</div>
	{/each}

	<h2 class="text-2xl">Nav bar links</h2>

	{#each buildRows(data.defaultConfig.navbarLinks, data.config?.[language]?.navbarLinks) as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="navbarLinks[{i}].label"
					class="form-input"
					value={link.label}
					placeholder={data.defaultConfig.navbarLinks[i]?.label ?? ''}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="navbarLinks[{i}].href"
					class="form-input"
					value={link.href}
					placeholder={data.defaultConfig.navbarLinks[i]?.href ?? ''}
				/>
			</label>
		</div>
	{/each}

	<h2 class="text-2xl">Footer links</h2>

	{#each buildRows(data.defaultConfig.footerLinks, data.config?.[language]?.footerLinks) as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="footerLinks[{i}].label"
					class="form-input"
					value={link.label}
					placeholder={data.defaultConfig.footerLinks[i]?.label ?? ''}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="footerLinks[{i}].href"
					class="form-input"
					value={link.href}
					placeholder={data.defaultConfig.footerLinks[i]?.href ?? ''}
				/>
			</label>
		</div>
	{/each}

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
