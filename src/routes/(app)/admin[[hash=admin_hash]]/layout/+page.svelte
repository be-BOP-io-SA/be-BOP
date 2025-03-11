<script lang="ts">
	import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product.js';
	import { upperFirst } from 'lodash-es';

	export let data;
	let viewportContentWidth = data.viewportContentWidth;
	let viewportFor = data.viewportFor;

	let navbarLinkLine = data.links.navbar.length || 2;
	let linkLine = data.links.topbar.length || 2;
	let footerLinkLine = data.links.footer.length || 2;
	let socialLinkLine = data.links.socialNetworkIcons.length || 2;
</script>

<form method="post" class="flex flex-col gap-4">
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="usersDarkDefaultTheme"
			class="form-checkbox"
			checked={data.usersDarkDefaultTheme}
		/>
		Use Dark mode by default for users
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="employeesDarkDefaultTheme"
			class="form-checkbox"
			checked={data.employeesDarkefaulTheme}
		/>
		Use Dark mode by default for employees
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
	<button class="btn btn-gray self-start" on:click={() => (linkLine += 1)} type="button"
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
	<button class="btn btn-gray self-start" on:click={() => (navbarLinkLine += 1)} type="button"
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
	<button class="btn btn-gray self-start" on:click={() => (footerLinkLine += 1)} type="button"
		>Add footer link
	</button>

	<h2 class="text-2xl">Social network icons</h2>

	<h3 class="text-xl">Links</h3>

	{#each [...data.links.socialNetworkIcons, ...Array(socialLinkLine).fill( { name: '', svg: '', href: '' } )].slice(0, socialLinkLine) as icon, i}
		<div class="flex gap-4">
			<label class="form-label">
				Name
				<input
					type="text"
					name="socialNetworkIcons[{i}].name"
					class="form-input"
					value={icon.name}
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
					value={icon.svg}
				/>
			</label>
			<label class="form-label">
				Url
				<input
					type="text"
					name="socialNetworkIcons[{i}].href"
					class="form-input"
					value={icon.href}
				/>
			</label>
			<button
				type="button"
				class="self-start mt-10"
				on:click={() => {
					(data.links.socialNetworkIcons = data.links.socialNetworkIcons.filter(
						(li) => icon.href !== li.href && icon.name !== li.name && icon.svg !== li.svg
					)),
						(socialLinkLine -= 1);
				}}>🗑️</button
			>
		</div>
	{/each}
	<button class="btn btn-gray self-start" on:click={() => (socialLinkLine += 1)} type="button"
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
	<button class="btn btn-black self-start" type="submit">Update</button>
</form>
