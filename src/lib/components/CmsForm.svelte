<script lang="ts">
	import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
	import Editor from '@tinymce/tinymce-svelte';
	import {
		TINYMCE_PLUGINS,
		TINYMCE_TOOLBAR
	} from '../../routes/(app)/admin[[hash=admin_hash]]/cms/tinymce-plugins';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';

	export let cmsPage: {
		_id: string;
		title: string;
		shortDescription: string;
		fullScreen: boolean;
		hideFromSEO?: boolean;
		hasMobileContent?: boolean;
		hasEmployeeContent?: boolean;
		maintenanceDisplay: boolean;
		content: string;
		mobileContent?: string;
		employeeContent?: string;
		metas?: {
			name: string;
			content: string;
		}[];
	} | null;

	export let slug = cmsPage?._id || '';
	let pageContent = cmsPage?.content || '';
	let title = cmsPage?.title || '';
	let shortDescription = cmsPage?.shortDescription || '';
	let fullScreen = cmsPage?.fullScreen || false;
	let maintenanceDisplay = cmsPage?.maintenanceDisplay || false;
	let hideFromSEO = cmsPage?.hideFromSEO || false;
	let hasCustomMeta = !!cmsPage?.metas?.length;
	let hasMobileContent = cmsPage?.hasMobileContent || false;
	let hasEmployeeContent = cmsPage?.hasEmployeeContent || false;
	let mobileContent = cmsPage?.mobileContent || '';
	let employeeContent = cmsPage?.employeeContent || '';

	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this CMS page?')) {
			event.preventDefault();
		}
	}
	let metas = cmsPage?.metas;
	let cmsMetaLine = cmsPage?.metas?.length ?? 2;
</script>

<form method="post" class="flex flex-col gap-4">
	<label>
		Page slug
		<input
			class="form-input block"
			type="text"
			placeholder="Page slug"
			name="slug"
			value={slug}
			disabled={!!cmsPage}
			required
		/>
	</label>

	<label>
		Page title
		<input
			class="form-input block"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="title"
			placeholder="Page title"
			value={title}
			required
		/>
	</label>

	<label>
		Short description
		<textarea
			name="shortDescription"
			cols="30"
			rows="2"
			placeholder="Shown in social media previews"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			class="form-input block w-full"
			value={shortDescription}
		/>
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="fullScreen" checked={fullScreen} class="form-checkbox" />
		Full screen
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="maintenanceDisplay"
			checked={maintenanceDisplay}
			class="form-checkbox"
		/>
		Available even in Maintenance mode
	</label>
	<label class="checkbox-label">
		<input type="checkbox" name="hideFromSEO" checked={hideFromSEO} class="form-checkbox" />
		Hide this page from search engines
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hasCustomMeta"
			bind:checked={hasCustomMeta}
			class="form-checkbox"
		/>
		Add custom meta tag
	</label>
	{#if hasCustomMeta}
		{#each [...(metas ?? []), ...Array(cmsMetaLine).fill( { name: '', content: '' } )].slice(0, cmsMetaLine) as meta, i}
			<div class="flex gap-4">
				<label class="form-label">
					Name
					<input
						type="text"
						name="metas[{i}].name"
						class="form-input"
						value={meta.name}
						pattern="^(?!.*\b(description|viewport)\b).*$"
						title="Les mots 'description' et 'viewport' ne sont pas autorisés."
					/>
				</label>
				<label class="form-label">
					Content <input
						type="text"
						name="metas[{i}].content"
						class="form-input"
						value={meta.content}
					/>
				</label>
				{#if cmsPage && cmsPage?.metas?.length}
					<button
						type="button"
						class="self-start mt-8"
						on:click={() => {
							(metas = cmsPage?.metas?.filter(
								(m) => !(m.name === meta.name && m.content === meta.content)
							)),
								(cmsMetaLine -= 1);
						}}>🗑️</button
					>{/if}
			</div>
		{/each}
		<button class="btn btn-gray" on:click={() => (cmsMetaLine += 1)} type="button"
			>Add custom meta balise
		</button>
	{/if}
	<label class="block w-full mt-4">
		Content
		<Editor
			scriptSrc="/tinymce/tinymce.js"
			bind:value={pageContent}
			conf={{ plugins: TINYMCE_PLUGINS, toolbar: TINYMCE_TOOLBAR }}
		/>

		<ul class="text-gray-700 my-3 list-disc ml-4">
			<li>
				To include products, add a paragraph with only <code class="font-mono">[Product=slug]</code
				>, where
				<code class="font-mono">slug</code> is the slug of your product. You can specify the display
				option like this:
				<code class="font-mono">[Product=slug?display=img-1]</code>
			</li>
			<li>
				To include pictures, add a paragraph with only <code class="font-mono"
					>[Picture=slug]
				</code>. You can also set the width, height and fit:
				<code class="font-mono">[Picture=slug width=100 height=100 fit=cover]</code> or
				<code class="font-mono">[Picture=slug width=100 height=100 fit=contain]</code>
			</li>
			<li>
				To include challenges, add a paragraph with only <code class="font-mono"
					>[Challenge=slug]</code
				>, where
				<code class="font-mono">slug</code> is the slug of your challenge
			</li>
			<li>
				To include sliders, add a paragraph with only <code class="font-mono">[Slider=slug]</code>,
				where
				<code class="font-mono">slug</code> is the slug of your slider. You can specify the autoplay
				duration in milliseconds like this:
				<code class="font-mono">[Slider=slug?autoplay=3000]</code>
			</li>
			<li>
				To include a specification widget, add a paragraph with only <code class="font-mono"
					>[Specification=slug]</code
				>, where <code class="font-mono">slug</code> is the slug of your specification.
			</li>
			<li>
				To include a tag widget, add a paragraph with only <code class="font-mono">[Tag=slug]</code
				>, where
				<code class="font-mono">slug</code> is the slug of your tag. You can specify the display
				option like this:
				<code class="font-mono">[Tag=slug?display=var-1]</code>
			</li>
			<li>
				To include a tagProducts widget, add a paragraph with only <code class="font-mono"
					>[TagProducts=slug]</code
				>, where
				<code class="font-mono">slug</code> is the slug of your tag. You can specify the display
				option like this:
				<code class="font-mono">[TagProducts=slug?display=img-3]</code>
			</li>
			<li>
				To include a form widget, add a paragraph with only <code class="font-mono"
					>[Form=slug]</code
				>, where
				<code class="font-mono">slug</code> is the slug of your form.
			</li>
			<li>
				To include a countdown widget, add a paragraph with only <code class="font-mono"
					>[Countdown=slug]</code
				>, where
				<code class="font-mono">slug</code> is the slug of your countdown.
			</li>
			<li>
				To include a specification widget, add a paragraph with only <code class="font-mono"
					>[Specification=slug]</code
				>, where
				<code class="font-mono">slug</code> is the slug of your specification.
			</li>
			<li>
				To include a gallery widget, add a paragraph with only <code class="font-mono"
					>[Gallery=slug]</code
				>, where
				<code class="font-mono">slug</code> is the slug of your gallery. You can specify the display
				option like this:
				<code class="font-mono">[Gallery=slug?display=var-1]</code>
			</li>
		</ul>

		Raw HTML

		<textarea
			name="content"
			cols="30"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder="HTML content"
			class="form-input block w-full"
			bind:value={pageContent}
		/>
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hasMobileContent"
			bind:checked={hasMobileContent}
			class="form-checkbox"
		/>
		This page has a subtitution target on mobile devices
	</label>
	{#if hasMobileContent}
		<label class="block w-full mt-4">
			Substitution content
			<Editor
				scriptSrc="/tinymce/tinymce.js"
				bind:value={mobileContent}
				conf={{ plugins: TINYMCE_PLUGINS, toolbar: TINYMCE_TOOLBAR }}
			/>

			Raw HTML

			<textarea
				name="mobileContent"
				cols="30"
				rows="10"
				maxlength={MAX_CONTENT_LIMIT}
				placeholder="HTML content"
				class="form-input block w-full"
				bind:value={mobileContent}
			/>
		</label>
	{/if}
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hasEmployeeContent"
			bind:checked={hasEmployeeContent}
			class="form-checkbox"
		/>
		This page has a subtitution target for employee
	</label>
	{#if hasEmployeeContent}
		<label class="block w-full mt-4">
			Employee content
			<Editor
				scriptSrc="/tinymce/tinymce.js"
				bind:value={employeeContent}
				conf={{ plugins: TINYMCE_PLUGINS, toolbar: TINYMCE_TOOLBAR }}
			/>

			Raw HTML

			<textarea
				name="employeeContent"
				cols="30"
				rows="10"
				maxlength={MAX_CONTENT_LIMIT}
				placeholder="HTML content"
				class="form-input block w-full"
				bind:value={employeeContent}
			/>
		</label>
	{/if}
	<div class="flex flex-row justify-between gap-2">
		{#if cmsPage}
			<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
			{#if hasMobileContent && mobileContent}
				<a href="/{slug}?content=desktop" class="btn btn-gray">View 💻</a>
				<a href="/{slug}?content=mobile" class="btn btn-gray">View 📱</a>
			{:else}
				<a href="/{slug}" class="btn btn-gray">View</a>
			{/if}

			<input
				type="submit"
				class="btn btn-red text-white ml-auto"
				formaction="?/delete"
				value="Delete"
				on:click={confirmDelete}
			/>
		{:else}
			<input type="submit" class="btn btn-blue text-white" value="Submit" />
		{/if}
	</div>
</form>
