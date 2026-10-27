<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preUploadPicture } from '$lib/types/Picture';
	import { generateId } from '$lib/utils/generateId';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
	let name = '';
	let slug = '';
	let submitting = false;
	let formElement: HTMLFormElement;
	let galleryPictures: FileList[] = [];

	async function handleSubmit() {
		try {
			submitting = true;
			// Need to load here, or for some reason, some inputs disappear afterwards
			const formData = new FormData(formElement);
			await Promise.all(
				galleryPictures.map(async (picture, i) => {
					if (picture[0]) {
						const pictureId = await preUploadPicture(data.adminPrefix, picture[0]);
						formData.set(`secondary[${i}].pictureId`, pictureId);
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

<h1 class="text-3xl">{t('admin.gallery.addAGallery')}</h1>

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
		{t('admin.gallery.galleryName')}
		<input
			class="form-input"
			type="text"
			name="name"
			placeholder={t('admin.gallery.galleryName')}
			bind:value={name}
			on:change={() => (slug = generateId(name, false))}
			on:input={() => (slug = generateId(name, false))}
			required
		/>
	</label>
	<label class="form-label">
		{t('admin.gallery.gallerySlug')}
		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.gallery.slug')}
			bind:value={slug}
			title={t('admin.gallery.slugHint')}
			required
		/>
	</label>
	<h3 class="text-xl">{t('admin.gallery.principalGallery')}</h3>
	<label class="form-label">
		{t('admin.gallery.galleryTitle')}
		<input
			class="form-input"
			type="text"
			name="principal.title"
			placeholder={t('admin.gallery.galleryTitle')}
		/>
	</label>
	<label class="form-label">
		{t('admin.gallery.galleryContent')}
		<textarea name="principal.content" cols="30" rows="5" maxlength="10000" class="form-input" />
	</label>
	<div class="flex gap-4">
		<label class="form-label">
			{t('admin.gallery.text')}
			<input type="text" name="principal.cta.label" class="form-input" />
		</label>
		<label class="form-label">
			{t('admin.gallery.url')}
			<input type="text" name="principal.cta.href" class="form-input" />
		</label>
		<label class="checkbox-label mt-4">
			<input class="form-checkbox" type="checkbox" name="principal.cta.openNewTab" />
			{t('admin.gallery.openInNewTab')}
		</label>
	</div>

	<h3 class="text-xl">{t('admin.gallery.secondaryGallery')}</h3>
	{#each [0, 1, 2] as i}
		<label class="form-label">
			{t('admin.gallery.gallerySubtitle', { number: i + 1 })}
			<input
				class="form-input"
				type="text"
				name="secondary[{i}].title"
				placeholder={t('admin.gallery.galleryTitle')}
				maxlength="30"
			/>
		</label>
		<label class="form-label">
			{t('admin.gallery.gallerySubcontent', { number: i + 1 })}
			<textarea
				name="secondary[{i}].content"
				cols="30"
				rows="5"
				maxlength="160"
				class="form-input"
			/>
		</label>
		<label class="form-label">
			{t('admin.gallery.picture', { number: i + 1 })}
			<input type="hidden" name="secondary[{i}].pictureId" class="form-input" />
			<input
				type="file"
				accept="image/jpeg,image/png,image/webp"
				class="block"
				bind:files={galleryPictures[i]}
				disabled={submitting}
			/>
		</label>
		<div class="flex gap-4">
			<label class="form-label">
				{t('admin.gallery.text')}
				<input type="text" name="secondary[{i}].cta.label" class="form-input" />
			</label>
			<label class="form-label">
				{t('admin.gallery.url')}
				<input type="text" name="secondary[{i}].cta.href" class="form-input" />
			</label>
			<label class="checkbox-label mt-4">
				<input class="form-checkbox" type="checkbox" name="secondary[{i}].cta.openNewTab" />
				{t('admin.gallery.openInNewTab')}
			</label>
		</div>
	{/each}

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value={t('admin.gallery.submit')}
		disabled={submitting}
	/>
</form>
