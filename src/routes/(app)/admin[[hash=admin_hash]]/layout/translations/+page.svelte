<script lang="ts">
	import { languageNames, type LanguageKey } from '$lib/translations/index.js';
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	let language: LanguageKey = 'fr';
</script>

<form method="post" class="contents">
	<label class="form-label">
		{t('admin.layout.selectLanguage')}

		<select bind:value={language} name="language" class="form-input">
			{#each data.locales as locale}
				<option value={locale}>{languageNames[locale]}</option>
			{/each}
		</select>
	</label>

	<label class="form-label">
		{t('admin.layout.brandName')}
		<input
			type="text"
			name="brandName"
			class="form-input"
			placeholder={data.defaultConfig.brandName}
			value={data.config?.[language]?.brandName ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.layout.websiteTitle')}
		<input
			type="text"
			name="websiteTitle"
			class="form-input"
			placeholder={data.defaultConfig.websiteTitle}
			value={data.config?.[language]?.websiteTitle ?? ''}
		/>
	</label>

	<label class="form-label">
		{t('admin.layout.websiteDescription')}

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

	<h2 class="text-2xl">{t('admin.layout.topbarLinks')}</h2>

	{#each [...(data.config?.[language]?.topbarLinks ?? []), { href: '', label: '' }] as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				{t('admin.layout.text')}
				<input
					type="text"
					name="topbarLinks[{i}].label"
					placeholder={data.defaultConfig.topbarLinks[i]?.label ?? ''}
					class="form-input"
					value={link.label}
				/>
			</label>
			<label class="form-label">
				{t('admin.layout.url')}
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

	<h2 class="text-2xl">{t('admin.layout.navbarLinks')}</h2>

	{#each [...(data.config?.[language]?.navbarLinks ?? []), { href: '', label: '' }] as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				{t('admin.layout.text')}
				<input
					type="text"
					name="navbarLinks[{i}].label"
					class="form-input"
					value={link.label}
					placeholder={data.defaultConfig.navbarLinks[i]?.label ?? ''}
				/>
			</label>
			<label class="form-label">
				{t('admin.layout.url')}
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

	<h2 class="text-2xl">{t('admin.layout.footerLinks')}</h2>

	{#each [...(data.config?.[language]?.footerLinks ?? []), { href: '', label: '' }] as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				{t('admin.layout.text')}
				<input
					type="text"
					name="footerLinks[{i}].label"
					class="form-input"
					value={link.label}
					placeholder={data.defaultConfig.footerLinks[i]?.label ?? ''}
				/>
			</label>
			<label class="form-label">
				{t('admin.layout.url')}
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

	<button class="btn btn-black self-start" type="submit">{t('admin.action.save')}</button>
</form>
