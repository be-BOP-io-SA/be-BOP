<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';

	export let data;

	let language: LanguageKey = 'fr';

	type LinkRow = { label: string; href: string; isTranslated: boolean };
	// Pre-create one row per entry that exists in the main config so the translator sees the
	// original (label + href) as placeholders next to an empty input. `+ Add link` buttons let
	// the operator stack translation-only entries that have no counterpart in main.
	let topbarExtra = 0;
	let navbarExtra = 0;
	let footerExtra = 0;
	function baseCount(
		main: ReadonlyArray<{ label: string; href: string }> | undefined,
		translated: ReadonlyArray<{ label: string; href: string }> | undefined
	): number {
		return Math.max(main?.length ?? 0, translated?.length ?? 0);
	}
	function buildRows(
		translated: ReadonlyArray<{ label: string; href: string }> | undefined,
		count: number
	): LinkRow[] {
		return Array.from({ length: count }, (_, i) => {
			const t = translated?.[i];
			return t
				? { label: t.label, href: t.href, isTranslated: true }
				: { label: '', href: '', isTranslated: false };
		});
	}
	$: topbarCount =
		baseCount(data.defaultConfig.topbarLinks, data.config?.[language]?.topbarLinks) + topbarExtra;
	$: navbarCount =
		baseCount(data.defaultConfig.navbarLinks, data.config?.[language]?.navbarLinks) + navbarExtra;
	$: footerCount =
		baseCount(data.defaultConfig.footerLinks, data.config?.[language]?.footerLinks) + footerExtra;
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

	{#each buildRows(data.config?.[language]?.topbarLinks, topbarCount) as link, i}
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
					value={link.isTranslated ? link.href : data.defaultConfig.topbarLinks[i]?.href ?? ''}
				/>
			</label>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (topbarExtra += 1)} type="button"
		>Add top bar link</button
	>

	<h2 class="text-2xl">Nav bar links</h2>

	{#each buildRows(data.config?.[language]?.navbarLinks, navbarCount) as link, i}
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
					value={link.isTranslated ? link.href : data.defaultConfig.navbarLinks[i]?.href ?? ''}
					placeholder={data.defaultConfig.navbarLinks[i]?.href ?? ''}
				/>
			</label>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (navbarExtra += 1)} type="button"
		>Add nav bar link</button
	>

	<h2 class="text-2xl">Footer links</h2>

	{#each buildRows(data.config?.[language]?.footerLinks, footerCount) as link, i}
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
					value={link.isTranslated ? link.href : data.defaultConfig.footerLinks[i]?.href ?? ''}
					placeholder={data.defaultConfig.footerLinks[i]?.href ?? ''}
				/>
			</label>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (footerExtra += 1)} type="button"
		>Add footer link</button
	>

	<button class="btn btn-black self-start" type="submit">Save</button>
</form>
