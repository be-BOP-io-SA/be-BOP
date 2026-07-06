<script lang="ts">
	import { generateId } from '$lib/utils/generateId';
	import PictureComponent from '$lib/components/Picture.svelte';
	import { invalidateAll } from '$app/navigation';
	import { applyAction, deserialize } from '$app/forms';
	import { preUploadPicture } from '$lib/types/Picture.js';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
	let name = data.gallery.name;
	let slug = data.gallery._id;
	let submitting = false;
	let formElement: HTMLFormElement;

	function confirmDelete(event: Event) {
		if (!confirm(t('admin.gallery.confirmDelete'))) {
			event.preventDefault();
		}
	}
	let galleryPictures: FileList[] = [];
	$: pictureById = Object.fromEntries(data.pictures.map((picture) => [picture._id, picture]));

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

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<form method="post" class="flex flex-col gap-4" action="?/update" bind:this={formElement}>
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
			value={data.gallery.principal.title}
			placeholder={t('admin.gallery.galleryTitle')}
		/>
	</label>
	<label class="form-label">
		{t('admin.gallery.galleryContent')}
		<textarea
			name="principal.content"
			value={data.gallery.principal.content}
			cols="30"
			rows="5"
			maxlength="10000"
			class="form-input"
		/>
	</label>
	<div class="flex gap-4">
		<label class="form-label">
			{t('admin.gallery.text')}
			<input
				type="text"
				name="principal.cta.label"
				class="form-input"
				value={data.gallery.principal.cta.label}
			/>
		</label>
		<label class="form-label">
			{t('admin.gallery.url')}
			<input
				type="text"
				name="principal.cta.href"
				class="form-input"
				value={data.gallery.principal.cta.href}
			/>
		</label>
		<label class="checkbox-label mt-4">
			<input
				class="form-checkbox"
				type="checkbox"
				name="principal.cta.openNewTab"
				checked={data.gallery.principal.cta.openNewTab}
			/>
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
				maxlength="30"
				placeholder={t('admin.gallery.galleryTitle')}
				value={data.gallery.secondary[i]?.title || ''}
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
				value={data.gallery.secondary[i]?.content || ''}
			/>
		</label>
		<div class="flex flex-col">
			<a
				href="{data.adminPrefix}/picture/{data.gallery.secondary[i]?.pictureId}"
				class="flex flex-col"
			>
				<PictureComponent
					picture={pictureById[data.gallery.secondary[i]?.pictureId || '']}
					class="h-36 block"
					style="object-fit: scale-down;"
				/>
			</a>
			<label class="form-label">
				{t('admin.gallery.picture', { number: i + 1 })}
				<input
					type="hidden"
					name="secondary[{i}].pictureId"
					class="form-input"
					value={data.gallery.secondary[i]?.pictureId}
				/>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					class="block"
					bind:files={galleryPictures[i]}
					disabled={submitting}
				/>
			</label>
		</div>
		<div class="flex gap-4">
			<label class="form-label">
				{t('admin.gallery.text')}
				<input
					type="text"
					name="secondary[{i}].cta.label"
					class="form-input"
					value={data.gallery.secondary[i]?.cta.label || ''}
				/>
			</label>
			<label class="form-label">
				{t('admin.gallery.url')}
				<input
					type="text"
					name="secondary[{i}].cta.href"
					class="form-input"
					value={data.gallery.secondary[i]?.cta.href || ''}
				/>
			</label>
			<label class="checkbox-label mt-4">
				<input
					class="form-checkbox"
					type="checkbox"
					name="secondary[{i}].cta.openNewTab"
					checked={data.gallery.secondary[i]?.cta.openNewTab}
				/>
				{t('admin.gallery.openInNewTab')}
			</label>
		</div>
	{/each}

	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue self-start text-white"
			value="Update"
			disabled={submitting}
			on:click|preventDefault={handleSubmit}
		/>
		<a href="/gallery/{data.gallery._id}" class="btn body-mainCTA">{t('admin.gallery.view')}</a>

		<button
			type="submit"
			class="ml-auto btn btn-red"
			formaction="?/delete"
			on:click={confirmDelete}
		>
			{t('admin.gallery.delete')}
		</button>
	</div>
</form>
