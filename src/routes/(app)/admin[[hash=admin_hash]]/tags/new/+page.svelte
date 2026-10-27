<script lang="ts">
	import { generateId } from '$lib/utils/generateId';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preUploadPicture } from '$lib/types/Picture.js';
	import { page } from '$app/stores';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
	let pageId = $page.url.searchParams.get('id') || null;
	let name = $page.url.searchParams.get('id')?.replaceAll('-', ' ') ?? '';
	let slug = pageId ?? '';
	let formElement: HTMLFormElement;
	let fileMainPicture: FileList | null = null;
	let fileFullPicture: FileList | null = null;
	let fileWideBanner: FileList | null = null;
	let fileSlimBanner: FileList | null = null;
	let fileAvatar: FileList | null = null;
	let tagCtaLines = 2;
	let submitting = false;
	async function handleSubmit() {
		try {
			submitting = true;
			// Need to load here, or for some reason, some inputs disappear afterwards
			const formData = new FormData(formElement);
			const picturesToUpload = [
				{ file: fileMainPicture, id: 'mainPictureId' },
				{ file: fileFullPicture, id: 'fullPictureId' },
				{ file: fileWideBanner, id: 'wideBannerId' },
				{ file: fileSlimBanner, id: 'slimBannerId' },
				{ file: fileAvatar, id: 'avatarId' }
			];
			await Promise.all(
				picturesToUpload.map(async (picture) => {
					if (picture.file) {
						const pictureId = await preUploadPicture(data.adminPrefix, picture.file[0], {
							fileName: name
						});
						formData.set(picture.id, pictureId);
					}
				})
			);

			const finalResponse = await fetch(formElement.action, {
				method: 'POST',
				body: formData
			});

			const result = deserialize(await finalResponse.text());

			if (result.type === 'success') {
				// rerun all `load` functions, following the successful update
				await invalidateAll();
			}

			applyAction(result);
		} finally {
			submitting = false;
		}
	}
</script>

<h1 class="text-3xl">{t('admin.tags.addTag')}</h1>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<form
	method="post"
	class="flex flex-col gap-4"
	bind:this={formElement}
	on:submit|preventDefault={handleSubmit}
>
	<label class="form-label">
		{t('admin.tags.tagNameLabel')}
		<input
			class="form-input"
			type="text"
			name="name"
			placeholder={t('admin.tags.tagNamePlaceholder')}
			bind:value={name}
			on:change={() => (slug = generateId(name, false))}
			on:input={() => (slug = generateId(name, false))}
			required
		/>
	</label>

	<label class="form-label">
		{t('admin.tags.slug')}

		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.tags.slug')}
			bind:value={slug}
			title={t('admin.tags.slugHint')}
			required
		/>
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="widgetUseOnly" />
		{t('admin.tags.forWidgetUseOnly')}
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="productTagging" />
		{t('admin.tags.availableForProductTagging')}
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="useLightDark" />
		{t('admin.tags.useLightDarkInvertedMode')}
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="reportingFilter" />
		{t('admin.tags.availableAsFilterForReporting')}
	</label>
	<div class="flex flex-col gap-4 w-[20em]">
		<label class="form-label">
			{t('admin.tags.tagFamilyLabel')}
			<select class="form-input" name="family">
				<option value="">{t('admin.tags.noFamily')}</option>
				{#each data.families as family}
					<option value={family._id}>{family.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="form-label">
		{t('admin.tags.tagTitleLabel')}
		<input
			class="form-input"
			type="text"
			name="title"
			placeholder={t('admin.tags.tagTitleLabel')}
		/>
	</label>
	<label class="form-label">
		{t('admin.tags.tagSubtitleLabel')}
		<input
			class="form-input"
			type="text"
			name="subtitle"
			placeholder={t('admin.tags.tagSubtitleLabel')}
		/>
	</label>
	<label class="form-label">
		{t('admin.tags.shortContent')}
		<textarea name="shortContent" cols="30" rows="2" class="form-input" />
	</label>
	<label class="form-label">
		{t('admin.tags.fullContent')}
		<textarea name="content" cols="30" rows="10" maxlength="10000" class="form-input" />
	</label>

	<input type="hidden" name="mainPictureId" />
	<label class="form-label">
		{t('admin.tags.mainPicture')}
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="block"
			bind:files={fileMainPicture}
			disabled={submitting}
		/>
	</label>
	<input type="hidden" name="fullPictureId" />
	<label class="form-label">
		{t('admin.tags.fullPicture')}
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="block"
			bind:files={fileFullPicture}
			disabled={submitting}
		/>
	</label>
	<input type="hidden" name="wideBannerId" />
	<label class="form-label">
		{t('admin.tags.wideBanner')}
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="block"
			bind:files={fileWideBanner}
			disabled={submitting}
		/>
	</label>
	<input type="hidden" name="slimBannerId" />
	<label class="form-label">
		{t('admin.tags.slimBanner')}
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="block"
			bind:files={fileSlimBanner}
			disabled={submitting}
		/>
	</label>
	<input type="hidden" name="avatarId" />
	<label class="form-label">
		{t('admin.tags.avatar')}
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="block"
			bind:files={fileAvatar}
			disabled={submitting}
		/>
	</label>

	<h3 class="text-xl">{t('admin.tags.ctas')}</h3>
	{#each [...Array(tagCtaLines).fill( { label: '', href: '', openNewTab: false } )].slice(0, tagCtaLines) as cta, i}
		<div class="flex gap-4">
			<label class="form-label">
				{t('admin.tags.ctaText')}
				<input type="text" name="cta[{i}].label" class="form-input" value={cta.label} />
			</label>
			<label class="form-label">
				{t('admin.tags.ctaUrl')}
				<input type="text" name="cta[{i}].href" class="form-input" value={cta.href} />
			</label>
			<label class="checkbox-label mt-4">
				<input class="form-checkbox" type="checkbox" name="cta[{i}].openNewTab" />
				{t('admin.tags.openInNewTab')}
			</label>
		</div>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (tagCtaLines += 1)} type="button"
		>{t('admin.tags.addCtas')}
	</button>

	<label class="form-label">
		{t('admin.tags.cssOverride')}
		<textarea name="cssOverride" cols="30" rows="10" maxlength="10000" class="form-input" />
	</label>

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value={t('admin.tags.submit')}
		disabled={submitting}
	/>
</form>
