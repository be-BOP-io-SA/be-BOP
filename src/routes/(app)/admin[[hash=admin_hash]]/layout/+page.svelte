<script lang="ts">
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product.js';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import { useI18n } from '$lib/i18n';
	import { socialIconPresets, type SocialIconPresetKey } from '$lib/social-icon-presets';

	const { t } = useI18n();

	export let data;
	let viewportContentWidth = data.viewportContentWidth;
	let viewportFor = data.viewportFor;

	let navbarLinkLine = data.links.navbar.length || 2;
	let linkLine = data.links.topbar.length || 2;
	let footerLinkLine = data.links.footer.length || 2;
	let visitorDarkLightMode: 'light' | 'dark' | 'system' = data.visitorDarkLightMode;
	let employeeDarkLightMode: 'light' | 'dark' | 'system' = data.employeeDarkLightMode;

	// Stable working copy bound to the row inputs. We keep at least 2 empty rows when nothing is
	// configured, matching the prior UX where the page always offered editable slots up front.
	const initialSocialMinRows = Math.max(data.links.socialNetworkIcons.length, 2);
	let socialIcons: Array<{ name: string; svg: string; href: string }> = [
		...data.links.socialNetworkIcons.map((i) => ({ ...i })),
		...Array.from({ length: initialSocialMinRows - data.links.socialNetworkIcons.length }, () => ({
			name: '',
			svg: '',
			href: ''
		}))
	];
	const presetKeys = (Object.keys(socialIconPresets) as SocialIconPresetKey[]).sort((a, b) =>
		socialIconPresets[a].name.localeCompare(socialIconPresets[b].name)
	);
	// Per-row preset selection. Empty string = nothing picked yet (the "Choose platform"
	// placeholder), `custom` = the operator explicitly opted for raw-SVG paste. Rows that load
	// with an SVG already saved default to `custom` so the textarea stays editable.
	let socialPresetSelections: Array<'' | 'custom' | SocialIconPresetKey> = socialIcons.map(
		(icon) => (icon.svg ? 'custom' : '')
	);

	function addSocialIconLine() {
		socialIcons = [...socialIcons, { name: '', svg: '', href: '' }];
		socialPresetSelections = [...socialPresetSelections, ''];
	}

	function removeSocialIconLine(index: number) {
		socialIcons = socialIcons.filter((_, i) => i !== index);
		socialPresetSelections = socialPresetSelections.filter((_, i) => i !== index);
	}

	function applyPreset(i: number, rawKey: string) {
		const key = rawKey as '' | 'custom' | SocialIconPresetKey;
		socialPresetSelections[i] = key;
		if (key === '' || key === 'custom') {
			return;
		}
		const preset = socialIconPresets[key];
		socialIcons[i] = {
			name: socialIcons[i].name || preset.name,
			svg: preset.svg,
			href: socialIcons[i].href
		};
		socialIcons = socialIcons;
	}
</script>

<form method="post" class="flex flex-col gap-4">
	<h3 class="text-xl">{t('admin.layout.visitorDefaultDarkLightMode')}</h3>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={visitorDarkLightMode}
			class="form-radio"
			name="visitorDarkLightMode"
			value="light"
		/>
		{t('admin.layout.useLightModeForUsers')}
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={visitorDarkLightMode}
			class="form-radio"
			name="visitorDarkLightMode"
			value="dark"
		/>
		{t('admin.layout.useDarkModeForUsers')}
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={visitorDarkLightMode}
			class="form-radio"
			name="visitorDarkLightMode"
			value="system"
		/>
		{t('admin.layout.useSystemModeForUsers')}
	</label>
	<h3 class="text-xl">{t('admin.layout.employeeDefaultDarkLightMode')}</h3>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={employeeDarkLightMode}
			class="form-radio"
			name="employeeDarkLightMode"
			value="light"
		/>
		{t('admin.layout.useLightModeForEmployee')}
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={employeeDarkLightMode}
			class="form-radio"
			name="employeeDarkLightMode"
			value="dark"
		/>
		{t('admin.layout.useDarkModeForEmployee')}
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={employeeDarkLightMode}
			class="form-radio"
			name="employeeDarkLightMode"
			value="system"
		/>
		{t('admin.layout.useSystemModeForEmployee')}
	</label>

	<h2 class="text-2xl">{t('admin.layout.product')}</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="disableZoomProductPicture"
			class="form-checkbox"
			checked={data.disableZoomProductPicture}
		/>
		{t('admin.layout.disableZoomProductPictures')}
	</label>
	<h2 class="text-2xl">{t('admin.layout.topBar')}</h2>

	<label class="form-label">
		{t('admin.layout.brandName')}
		<input type="text" name="brandName" class="form-input" value={data.brandName} />
	</label>

	<p>
		{t('admin.layout.changeLogoPrefix')}
		<a href="{data.adminPrefix}/picture" class="body-hyperlink hover:underline"
			>{t('admin.layout.pictures')}</a
		>{t('admin.layout.changeLogoSuffix')}
	</p>
	<p>
		{t('admin.layout.changeFaviconPrefix')}
		<a href="{data.adminPrefix}/picture" class="body-hyperlink hover:underline"
			>{t('admin.layout.pictures')}</a
		>{t('admin.layout.changeFaviconSuffix')}
	</p>
	<label class="form-label">
		{t('admin.layout.websiteTitle')}
		<input type="text" name="websiteTitle" class="form-input" value={data.websiteTitle} />
	</label>

	<label class="form-label">
		{t('admin.layout.websiteDescription')}
		<textarea
			name="websiteShortDescription"
			cols="30"
			rows="2"
			required
			placeholder={t('admin.layout.shownInSocialMediaPreviews')}
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			class="form-input block w-full"
			value={data.websiteShortDescription}
		/>
	</label>

	<h3 class="text-xl">{t('admin.layout.links')}</h3>

	{#each [...data.links.topbar, ...Array(linkLine).fill( { href: '', label: '', id: '' } )].slice(0, linkLine) as link, i}
		<div class="flex gap-4">
			<input type="hidden" name="topbarLinks[{i}].id" value={link.id ?? ''} />
			<label class="form-label">
				{t('admin.layout.text')}
				<input type="text" name="topbarLinks[{i}].label" class="form-input" value={link.label} />
			</label>
			<label class="form-label">
				{t('admin.layout.url')}
				<input type="text" name="topbarLinks[{i}].href" class="form-input" value={link.href} />
			</label>
			<button
				type="button"
				class="self-start mt-10"
				on:click={() => {
					(data.links.topbar = data.links.topbar.filter(
						(li) => link.href !== li.href && link.label !== li.label
					)),
						(linkLine -= 1);
				}}>🗑️</button
			>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (linkLine += 1)} type="button"
		>{t('admin.layout.addTopbarLink')}
	</button>

	<h2 class="text-2xl">{t('admin.layout.navBar')}</h2>

	<h3 class="text-xl">{t('admin.layout.links')}</h3>

	{#each [...data.links.navbar, ...Array(navbarLinkLine).fill( { href: '', label: '', id: '' } )].slice(0, navbarLinkLine) as link, i}
		<div class="flex gap-4">
			<input type="hidden" name="navbarLinks[{i}].id" value={link.id ?? ''} />
			<label class="form-label">
				{t('admin.layout.text')}
				<input type="text" name="navbarLinks[{i}].label" class="form-input" value={link.label} />
			</label>
			<label class="form-label">
				{t('admin.layout.url')}
				<input type="text" name="navbarLinks[{i}].href" class="form-input" value={link.href} />
			</label>
			<button
				type="button"
				class="self-start mt-10"
				on:click={() => {
					(data.links.navbar = data.links.navbar.filter(
						(li) => link.href !== li.href && link.label !== li.label
					)),
						(navbarLinkLine -= 1);
				}}>🗑️</button
			>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (navbarLinkLine += 1)} type="button"
		>{t('admin.layout.addNavbarLink')}
	</button>

	<h2 class="text-2xl">{t('admin.layout.footer')}</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayPoweredBy"
			class="form-checkbox"
			checked={data.displayPoweredBy}
		/>
		{t('admin.layout.displayPoweredBy')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayCompanyInfo"
			class="form-checkbox"
			checked={data.displayCompanyInfo}
		/>
		{t('admin.layout.displayCompanyInfo')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayMainShopInfo"
			class="form-checkbox"
			checked={data.displayMainShopInfo}
		/>
		{t('admin.layout.displayMainShopInfo')}
	</label>

	<h3 class="text-xl">{t('admin.layout.links')}</h3>

	{#each [...data.links.footer, ...Array(footerLinkLine).fill( { href: '', label: '', id: '' } )].slice(0, footerLinkLine) as link, i}
		<div class="flex gap-4">
			<input type="hidden" name="footerLinks[{i}].id" value={link.id ?? ''} />
			<label class="form-label">
				{t('admin.layout.text')}
				<input type="text" name="footerLinks[{i}].label" class="form-input" value={link.label} />
			</label>
			<label class="form-label">
				{t('admin.layout.url')}
				<input type="text" name="footerLinks[{i}].href" class="form-input" value={link.href} />
			</label>
			<button
				type="button"
				class="self-start mt-10"
				on:click={() => {
					(data.links.footer = data.links.footer.filter(
						(li) => link.href !== li.href && link.label !== li.label
					)),
						(footerLinkLine -= 1);
				}}>🗑️</button
			>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (footerLinkLine += 1)} type="button"
		>{t('admin.layout.addFooterLink')}
	</button>

	<h2 class="text-2xl">{t('admin.layout.socialNetworkIcons')}</h2>

	<h3 class="text-xl">{t('admin.layout.links')}</h3>

	{#each socialIcons as icon, i (i)}
		<div class="flex gap-4">
			<label class="form-label">
				{t('admin.layout.socialIconPreset')}
				<div class="flex items-center gap-2">
					<select
						class="form-input flex-1"
						value={socialPresetSelections[i]}
						on:change={(e) => applyPreset(i, e.currentTarget.value)}
					>
						<option value="" disabled hidden>{t('admin.layout.chooseSocialPlatform')}</option>
						<option value="custom">{t('admin.layout.custom')}</option>
						{#each presetKeys as key}
							<option value={key}>{socialIconPresets[key].name}</option>
						{/each}
					</select>
					<!-- Live preview. Dark background because preset / typical custom SVGs ship
					     with `fill="white"`; see lib/social-icon-presets.ts for the rationale and
					     the deferred currentColor migration. -->
					<span
						class="inline-flex items-center justify-center w-10 h-10 rounded bg-gray-800 shrink-0 overflow-hidden"
						aria-hidden="true"
					>
						{#if icon.svg}
							<!-- SVG comes from runtimeConfig (admin-controlled), same trust level as
							     the storefront footer that already injects the same string. -->
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html icon.svg}
						{/if}
					</span>
				</div>
			</label>
			<label class="form-label">
				{t('admin.layout.name')}
				<input
					type="text"
					name="socialNetworkIcons[{i}].name"
					class="form-input"
					bind:value={icon.name}
				/>
			</label>
			<label class="form-label">
				{t('admin.layout.svg')}
				<textarea
					name="socialNetworkIcons[{i}].svg"
					cols="30"
					rows="5"
					maxlength="10000"
					class="form-input"
					readonly={socialPresetSelections[i] !== 'custom'}
					bind:value={icon.svg}
				/>
			</label>
			<label class="form-label">
				{t('admin.layout.url')}
				<input
					type="text"
					name="socialNetworkIcons[{i}].href"
					class="form-input"
					bind:value={icon.href}
				/>
			</label>
			<button type="button" class="self-start mt-10" on:click={() => removeSocialIconLine(i)}
				>🗑️</button
			>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={addSocialIconLine} type="button"
		>{t('admin.layout.addSocialNetworkLink')}
	</button>
	<h2 class="text-2xl">{t('admin.layout.mobileDisplay')}</h2>
	<h2>{t('admin.layout.mobileDisplayDescription')}</h2>
	<h2>{t('admin.layout.defaultConfigurationIs')}</h2>
	<code class="font-mono">meta name="viewport" content="width=1000"</code>

	<label class="form-label">
		{t('admin.layout.viewportWidthDefault')}
		<input
			type="number"
			name="viewportContentWidth"
			class="form-input"
			max="1000"
			bind:value={viewportContentWidth}
		/>
	</label>
	<label class="form-label">
		{t('admin.layout.useContentWidthDeviceWidthFor')}
		<select class="form-input" name="viewportFor" required bind:value={viewportFor}>
			{#each ['no-one', 'employee', 'visitors', 'everyone'] as value}
				<option {value} selected={data.viewportFor === value}>{upperFirst(value)}</option>
			{/each}
		</select>
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hideCmsZonesOnMobile"
			class="form-checkbox"
			checked={data.hideCmsZonesOnMobile}
		/>
		{t('admin.layout.hideCmsZonesOnMobile')}
	</label>
	<h2 class="text-2xl">{t('admin.layout.fullWidthDisplay')}</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthHeader"
			class="form-checkbox"
			checked={data.displayFullWidthHeader}
		/>
		{t('admin.layout.displayFullWidthHeader')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthNavbar"
			class="form-checkbox"
			checked={data.displayFullWidthNavbar}
		/>
		{t('admin.layout.displayFullWidthNavbar')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthFooter"
			class="form-checkbox"
			checked={data.displayFullWidthFooter}
		/>
		{t('admin.layout.displayFullWidthFooter')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthProductPages"
			class="form-checkbox"
			checked={data.displayFullWidthProductPages}
		/>
		{t('admin.layout.displayFullWidthProductPages')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthCmsPages"
			class="form-checkbox"
			checked={data.displayFullWidthCmsPages}
		/>
		{t('admin.layout.displayFullWidthCmsPages')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="mergeMobileMenus"
			class="form-checkbox"
			checked={data.mergeMobileMenus}
		/>
		{t('admin.layout.mergeMobileMenus')}
	</label>
	<div>
		<button class="btn btn-black self-start" type="submit">{t('admin.action.update')}</button>
	</div>
</form>
