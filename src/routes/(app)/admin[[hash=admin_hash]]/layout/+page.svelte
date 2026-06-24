<script lang="ts">
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product.js';
	import { upperFirst } from '$lib/utils/upperFirst.js';
	import { socialIconPresets, type SocialIconPresetKey } from '$lib/social-icon-presets';

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
	const presetKeys = Object.keys(socialIconPresets) as SocialIconPresetKey[];
	// Per-row preset selection. Empty string = nothing picked yet (the "Choose platform"
	// placeholder), `custom` = the operator explicitly opted for raw-SVG paste.
	let socialPresetSelections: Array<'' | 'custom' | SocialIconPresetKey> = socialIcons.map(
		() => ''
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
	<h3 class="text-xl">Visitor default dark/light mode</h3>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={visitorDarkLightMode}
			class="form-radio"
			name="visitorDarkLightMode"
			value="light"
		/>
		Use light mode by default for users
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={visitorDarkLightMode}
			class="form-radio"
			name="visitorDarkLightMode"
			value="dark"
		/>
		Use Dark mode by default for users
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={visitorDarkLightMode}
			class="form-radio"
			name="visitorDarkLightMode"
			value="system"
		/>
		Use Dark/light mode corresponding to browser / OS by default for users
	</label>
	<h3 class="text-xl">Employee default dark/light mode</h3>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={employeeDarkLightMode}
			class="form-radio"
			name="employeeDarkLightMode"
			value="light"
		/>
		Use light mode by default for employee
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={employeeDarkLightMode}
			class="form-radio"
			name="employeeDarkLightMode"
			value="dark"
		/>
		Use Dark mode by default for employee
	</label>
	<label class="checkbox-label">
		<input
			type="radio"
			bind:group={employeeDarkLightMode}
			class="form-radio"
			name="employeeDarkLightMode"
			value="system"
		/>
		Use Dark/light mode corresponding to browser / OS by default for employee
	</label>

	<h2 class="text-2xl">Product</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="disableZoomProductPicture"
			class="form-checkbox"
			checked={data.disableZoomProductPicture}
		/>
		Disable zoom on product pictures.
	</label>
	<h2 class="text-2xl">Top bar</h2>

	<label class="form-label">
		Brand name
		<input type="text" name="brandName" class="form-input" value={data.brandName} />
	</label>

	<p>
		To change the logo, go to <a
			href="{data.adminPrefix}/picture"
			class="body-hyperlink hover:underline">pictures</a
		>, add a picture, and set it as logo
	</p>
	<p>
		To change the favicon, go to <a
			href="{data.adminPrefix}/picture"
			class="body-hyperlink hover:underline">pictures</a
		>, add a picture, and set it as favicon
	</p>
	<label class="form-label">
		Website title
		<input type="text" name="websiteTitle" class="form-input" value={data.websiteTitle} />
	</label>

	<label class="form-label">
		Website description
		<textarea
			name="websiteShortDescription"
			cols="30"
			rows="2"
			required
			placeholder="Shown in social media previews"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			class="form-input block w-full"
			value={data.websiteShortDescription}
		/>
	</label>

	<h3 class="text-xl">Links</h3>

	{#each [...data.links.topbar, ...Array(linkLine).fill( { href: '', label: '' } )].slice(0, linkLine) as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input type="text" name="topbarLinks[{i}].label" class="form-input" value={link.label} />
			</label>
			<label class="form-label">
				Url
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
		>Add topbar link
	</button>

	<h2 class="text-2xl">Nav bar</h2>

	<h3 class="text-xl">Links</h3>

	{#each [...data.links.navbar, ...Array(navbarLinkLine).fill( { href: '', label: '' } )].slice(0, navbarLinkLine) as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input type="text" name="navbarLinks[{i}].label" class="form-input" value={link.label} />
			</label>
			<label class="form-label">
				Url
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
		>Add navbar link
	</button>

	<h2 class="text-2xl">Footer</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayPoweredBy"
			class="form-checkbox"
			checked={data.displayPoweredBy}
		/>
		Display "Powered by be-BOP"
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayCompanyInfo"
			class="form-checkbox"
			checked={data.displayCompanyInfo}
		/>
		Display company identity & company contact
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayMainShopInfo"
			class="form-checkbox"
			checked={data.displayMainShopInfo}
		/>
		Display main shop informations
	</label>

	<h3 class="text-xl">Links</h3>

	{#each [...data.links.footer, ...Array(footerLinkLine).fill( { href: '', label: '' } )].slice(0, footerLinkLine) as link, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input type="text" name="footerLinks[{i}].label" class="form-input" value={link.label} />
			</label>
			<label class="form-label">
				Url
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
		>Add footer link
	</button>

	<h2 class="text-2xl">Social network icons</h2>

	<h3 class="text-xl">Links</h3>

	{#each socialIcons as icon, i (i)}
		<div class="flex gap-4">
			<label class="form-label">
				Preset
				<select
					class="form-input"
					value={socialPresetSelections[i]}
					on:change={(e) => applyPreset(i, e.currentTarget.value)}
				>
					<option value="" disabled hidden>Choose platform</option>
					<option value="custom">Custom</option>
					{#each presetKeys as key}
						<option value={key}>{socialIconPresets[key].name}</option>
					{/each}
				</select>
			</label>
			<label class="form-label">
				Name
				<input
					type="text"
					name="socialNetworkIcons[{i}].name"
					class="form-input"
					bind:value={icon.name}
				/>
			</label>
			<label class="form-label">
				SVG
				<textarea
					name="socialNetworkIcons[{i}].svg"
					cols="30"
					rows="5"
					maxlength="10000"
					class="form-input"
					bind:value={icon.svg}
				/>
			</label>
			<label class="form-label">
				Url
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
		>Add social network link
	</button>
	<h2 class="text-2xl">Mobile Display</h2>
	<h2>Allow you to customize be-bop default behavior on mobile</h2>
	<h2>Default configuration is:</h2>
	<code class="font-mono">meta name="viewport" content="width=1000"</code>

	<label class="form-label">
		Viewport width (default: 1000)
		<input
			type="number"
			name="viewportContentWidth"
			class="form-input"
			max="1000"
			bind:value={viewportContentWidth}
		/>
	</label>
	<label class="form-label">
		Use content="width=device-width" for:
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
		Hide every CMS additional zone on mobile (product, cart, checkout and order page)
	</label>
	<h2 class="text-2xl">Full width display</h2>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthHeader"
			class="form-checkbox"
			checked={data.displayFullWidthHeader}
		/>
		Display full width header
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthNavbar"
			class="form-checkbox"
			checked={data.displayFullWidthNavbar}
		/>
		Display full width navigation bar
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthFooter"
			class="form-checkbox"
			checked={data.displayFullWidthFooter}
		/>
		Display full width footer
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthProductPages"
			class="form-checkbox"
			checked={data.displayFullWidthProductPages}
		/>
		Display full width product pages
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayFullWidthCmsPages"
			class="form-checkbox"
			checked={data.displayFullWidthCmsPages}
		/>
		Display full width CMS pages
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="mergeMobileMenus"
			class="form-checkbox"
			checked={data.mergeMobileMenus}
		/>
		Merge topbar and navbar entries on the same burger menu on mobile
	</label>
	<div>
		<button class="btn btn-black self-start" type="submit">Update</button>
	</div>
</form>
