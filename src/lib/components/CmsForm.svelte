<script lang="ts">
	import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
	import Editor from '@tinymce/tinymce-svelte';
	import {
		TINYMCE_PLUGINS,
		TINYMCE_TOOLBAR
	} from '../../routes/(app)/admin[[hash=admin_hash]]/cms/tinymce-plugins';
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import { generateId } from '$lib/utils/generateId';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let cmsPage: {
		_id: string;
		title: string;
		shortDescription: string;
		fullScreen: boolean;
		hideFromSEO?: boolean;
		hasMobileContent?: boolean;
		hasEmployeeContent?: boolean;
		displayRawContent?: boolean;
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
	let advancedHtmlEdition = cmsPage?.displayRawContent || false;
	let mobileContent = cmsPage?.mobileContent || '';
	let employeeContent = cmsPage?.employeeContent || '';
	let slugElement: HTMLInputElement;
	let formElement: HTMLFormElement;
	let showTips = false;
	let displayRawHTML = false;

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.cmsForm.confirmDelete'))) {
			event.preventDefault();
		}
	}
	let metas = cmsPage?.metas;
	let cmsMetaLine = cmsPage?.metas?.length ?? 2;

	$: if (advancedHtmlEdition) {
		displayRawHTML = true;
	} else {
		displayRawHTML = false;
	}

	const slugRegex = /^(?!admin$)(?!admin-)[a-z0-9-]+$/;
	function validateSlug(event: SubmitEvent) {
		const value = slugElement.value;
		const result = slugRegex.test(value);
		if (!result && !cmsPage?._id) {
			slugElement.setCustomValidity(t('admin.cmsForm.slugValidationError'));
			slugElement.reportValidity();
			event.preventDefault();
			return;
		} else {
			formElement.submit();
		}
	}
	$: if (!cmsPage?._id) {
		slug = generateId(title, false);
	}
</script>

<form method="post" class="flex flex-col gap-4" bind:this={formElement} on:submit={validateSlug}>
	<label>
		{t('admin.cmsForm.pageTitle')}
		<input
			class="form-input block"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="title"
			placeholder={t('admin.cmsForm.pageTitle')}
			bind:value={title}
			required
		/>
	</label>

	<label>
		{t('admin.cmsForm.pageSlug')}
		<input
			class="form-input block"
			type="text"
			placeholder={t('admin.cmsForm.pageSlug')}
			name="slug"
			bind:value={slug}
			disabled={!!cmsPage}
			required
			bind:this={slugElement}
			on:input={() => slugElement.setCustomValidity('')}
		/>
	</label>

	<label>
		{t('admin.cmsForm.shortDescription')}
		<textarea
			name="shortDescription"
			cols="30"
			rows="2"
			placeholder={t('admin.cmsForm.shortDescriptionPlaceholder')}
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			class="form-input block w-full"
			value={shortDescription}
		/>
	</label>

	<label class="checkbox-label">
		<input type="checkbox" name="fullScreen" checked={fullScreen} class="form-checkbox" />
		{t('admin.cmsForm.fullScreen')}
	</label>

	<label class="checkbox-label">
		<input
			type="checkbox"
			name="maintenanceDisplay"
			checked={maintenanceDisplay}
			class="form-checkbox"
		/>
		{t('admin.cmsForm.availableInMaintenance')}
	</label>
	<label class="checkbox-label">
		<input type="checkbox" name="hideFromSEO" checked={hideFromSEO} class="form-checkbox" />
		{t('admin.cmsForm.hideFromSeo')}
	</label>
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="hasCustomMeta"
			bind:checked={hasCustomMeta}
			class="form-checkbox"
		/>
		{t('admin.cmsForm.addCustomMetaTag')}
	</label>
	{#if hasCustomMeta}
		{#each [...(metas ?? []), ...Array(cmsMetaLine).fill( { name: '', content: '' } )].slice(0, cmsMetaLine) as meta, i}
			<div class="flex gap-4">
				<label class="form-label">
					{t('admin.cmsForm.metaName')}
					<input
						type="text"
						name="metas[{i}].name"
						class="form-input"
						value={meta.name}
						pattern="^(?!.*\b(description|viewport)\b).*$"
						title={t('admin.cmsForm.reservedMetaNameError')}
					/>
				</label>
				<label class="form-label">
					{t('admin.cmsForm.content')}
					<input type="text" name="metas[{i}].content" class="form-input" value={meta.content} />
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
		<button class="btn body-mainCTA" on:click={() => (cmsMetaLine += 1)} type="button"
			>{t('admin.cmsForm.addCustomMetaBalise')}
		</button>
	{/if}
	<label class="checkbox-label">
		<input
			type="checkbox"
			name="displayRawContent"
			bind:checked={advancedHtmlEdition}
			class="form-checkbox"
		/>
		{t('admin.cmsForm.useAdvancedHtmlEdition')}
	</label>
	{#if advancedHtmlEdition}
		<p class="text-red-500">
			{t('admin.cmsForm.advancedHtmlWarning')}
		</p>
	{/if}
	<label class="block w-full mt-4">
		{t('admin.cmsForm.content')}
		{#if !advancedHtmlEdition}
			<Editor
				scriptSrc="/tinymce/tinymce.js"
				bind:value={pageContent}
				conf={{ plugins: TINYMCE_PLUGINS, toolbar: TINYMCE_TOOLBAR }}
			/>
		{/if}
		<label class="checkbox-label my-2">
			<input type="checkbox" name="showTips" bind:checked={showTips} class="form-checkbox" />
			{t('admin.cmsForm.showTips')}
		</label>
		{#if showTips}
			<ul class="text-gray-700 my-3 list-disc ml-4">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsProduct')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsPicture')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsChallenge')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsSlider')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsSpecification')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsTag')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsTagProducts')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsForm')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsCountdown')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsSpecification')}</li>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				<li>{@html t('admin.cmsForm.tipsGallery')}</li>
			</ul>
		{/if}
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="displayRawHTML"
				bind:checked={displayRawHTML}
				disabled={advancedHtmlEdition}
				class="form-checkbox"
			/>
			{t('admin.cmsForm.displayRawHtml')}
		</label>
		{#if displayRawHTML}
			{t('admin.cmsForm.rawHtml')}
		{/if}

		<textarea
			style="display:{displayRawHTML ? 'block' : 'none'};"
			name="content"
			cols="30"
			rows="10"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder={t('admin.cmsForm.htmlContentPlaceholder')}
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
		{t('admin.cmsForm.hasMobileContentLabel')}
	</label>
	{#if hasMobileContent}
		<label class="block w-full mt-4">
			{t('admin.cmsForm.substitutionContent')}
			{#if !advancedHtmlEdition}
				<Editor
					scriptSrc="/tinymce/tinymce.js"
					bind:value={mobileContent}
					conf={{ plugins: TINYMCE_PLUGINS, toolbar: TINYMCE_TOOLBAR }}
				/>
			{/if}

			{t('admin.cmsForm.rawHtml')}

			<textarea
				name="mobileContent"
				cols="30"
				rows="10"
				maxlength={MAX_CONTENT_LIMIT}
				placeholder={t('admin.cmsForm.htmlContentPlaceholder')}
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
		{t('admin.cmsForm.hasEmployeeContentLabel')}
	</label>
	{#if hasEmployeeContent}
		<label class="block w-full mt-4">
			{t('admin.cmsForm.employeeContent')}
			{#if !advancedHtmlEdition}
				<Editor
					scriptSrc="/tinymce/tinymce.js"
					bind:value={employeeContent}
					conf={{ plugins: TINYMCE_PLUGINS, toolbar: TINYMCE_TOOLBAR }}
				/>
			{/if}

			{t('admin.cmsForm.rawHtml')}

			<textarea
				name="employeeContent"
				cols="30"
				rows="10"
				maxlength={MAX_CONTENT_LIMIT}
				placeholder={t('admin.cmsForm.htmlContentPlaceholder')}
				class="form-input block w-full"
				bind:value={employeeContent}
			/>
		</label>
	{/if}
	<div class="flex flex-row justify-between gap-2">
		{#if cmsPage}
			<input
				type="submit"
				class="btn btn-blue text-white"
				formaction="?/update"
				value={t('admin.action.update')}
			/>
			{#if hasMobileContent && mobileContent}
				<a href="/{slug}?content=desktop" class="btn body-mainCTA"
					>{t('admin.cmsForm.viewDesktop')}</a
				>
				<a href="/{slug}?content=mobile" class="btn body-mainCTA">{t('admin.cmsForm.viewMobile')}</a
				>
			{:else}
				<a href="/{slug}" class="btn body-mainCTA">{t('admin.cmsForm.view')}</a>
			{/if}

			<input
				type="submit"
				class="btn btn-red text-white ml-auto"
				formaction="?/delete"
				value={t('admin.cmsForm.delete')}
				on:click={confirmDelete}
			/>
		{:else}
			<input type="submit" class="btn btn-blue text-white" value={t('admin.cmsForm.submit')} />
		{/if}
	</div>
</form>
