<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';

	export let data;

	let language: LanguageKey = 'fr';

	type LinkRow = { label: string; href: string; isTranslated: boolean };
	// Pre-create one row per entry that exists in the main config so the translator sees the
	// original (label + href) as placeholders next to an empty input. `+ Add link` buttons let
	// the operator stack translation-only entries that have no counterpart in main; the 🗑️
	// button hides a row from the form so saving drops the entry.
	let topbarExtra = 0;
	let navbarExtra = 0;
	let footerExtra = 0;
	let topbarOmitted: Set<number> = new Set();
	let navbarOmitted: Set<number> = new Set();
	let footerOmitted: Set<number> = new Set();
	let lastLanguage: LanguageKey = language;
	$: if (language !== lastLanguage) {
		lastLanguage = language;
		topbarExtra = 0;
		navbarExtra = 0;
		footerExtra = 0;
		topbarOmitted = new Set();
		navbarOmitted = new Set();
		footerOmitted = new Set();
	}

	function baseCount(
		main: ReadonlyArray<{ label: string; href: string }> | undefined,
		translated: ReadonlyArray<{ label: string; href: string }> | undefined
	): number {
		return Math.max(main?.length ?? 0, translated?.length ?? 0);
	}
	function buildRows(
		translated: ReadonlyArray<{ label: string; href: string }> | undefined,
		count: number,
		omitted: Set<number>
	): Array<{ row: LinkRow; originalIdx: number }> {
		const rows: Array<{ row: LinkRow; originalIdx: number }> = [];
		for (let i = 0; i < count; i++) {
			if (omitted.has(i)) {
				continue;
			}
			const t = translated?.[i];
			rows.push({
				row: t
					? { label: t.label, href: t.href, isTranslated: true }
					: { label: '', href: '', isTranslated: false },
				originalIdx: i
			});
		}
		return rows;
	}
	function omit(set: Set<number>, idx: number): Set<number> {
		const next = new Set(set);
		next.add(idx);
		return next;
	}
	$: topbarRows = buildRows(
		data.config?.[language]?.topbarLinks,
		baseCount(data.defaultConfig.topbarLinks, data.config?.[language]?.topbarLinks) + topbarExtra,
		topbarOmitted
	);
	$: navbarRows = buildRows(
		data.config?.[language]?.navbarLinks,
		baseCount(data.defaultConfig.navbarLinks, data.config?.[language]?.navbarLinks) + navbarExtra,
		navbarOmitted
	);
	$: footerRows = buildRows(
		data.config?.[language]?.footerLinks,
		baseCount(data.defaultConfig.footerLinks, data.config?.[language]?.footerLinks) + footerExtra,
		footerOmitted
	);
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

	{#each topbarRows as { row, originalIdx }, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="topbarLinks[{i}].label"
					placeholder={data.defaultConfig.topbarLinks[originalIdx]?.label ?? ''}
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
					placeholder={data.defaultConfig.topbarLinks[originalIdx]?.href ?? ''}
					value={row.isTranslated
						? row.href
						: data.defaultConfig.topbarLinks[originalIdx]?.href ?? ''}
				/>
			</label>
			<button
				type="button"
				class="self-start mt-10"
				on:click={() => (topbarOmitted = omit(topbarOmitted, originalIdx))}>🗑️</button
			>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (topbarExtra += 1)} type="button"
		>Add top bar link</button
	>

	<h2 class="text-2xl">Nav bar links</h2>

	{#each navbarRows as { row, originalIdx }, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="navbarLinks[{i}].label"
					class="form-input"
					value={row.label}
					placeholder={data.defaultConfig.navbarLinks[originalIdx]?.label ?? ''}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="navbarLinks[{i}].href"
					class="form-input"
					value={row.isTranslated
						? row.href
						: data.defaultConfig.navbarLinks[originalIdx]?.href ?? ''}
					placeholder={data.defaultConfig.navbarLinks[originalIdx]?.href ?? ''}
				/>
			</label>
			<button
				type="button"
				class="self-start mt-10"
				on:click={() => (navbarOmitted = omit(navbarOmitted, originalIdx))}>🗑️</button
			>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (navbarExtra += 1)} type="button"
		>Add nav bar link</button
	>

	<h2 class="text-2xl">Footer links</h2>

	{#each footerRows as { row, originalIdx }, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input
					type="text"
					name="footerLinks[{i}].label"
					class="form-input"
					value={row.label}
					placeholder={data.defaultConfig.footerLinks[originalIdx]?.label ?? ''}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="footerLinks[{i}].href"
					class="form-input"
					value={row.isTranslated
						? row.href
						: data.defaultConfig.footerLinks[originalIdx]?.href ?? ''}
					placeholder={data.defaultConfig.footerLinks[originalIdx]?.href ?? ''}
				/>
			</label>
			<button
				type="button"
				class="self-start mt-10"
				on:click={() => (footerOmitted = omit(footerOmitted, originalIdx))}>🗑️</button
			>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (footerExtra += 1)} type="button"
		>Add footer link</button
	>

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
