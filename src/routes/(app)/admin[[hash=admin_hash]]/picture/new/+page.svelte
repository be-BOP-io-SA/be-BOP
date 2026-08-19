<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { TAGTYPES, preUploadPicture } from '$lib/types/Picture.js';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	const productId = $page.url.searchParams.get('productId');
	const sliderId = $page.url.searchParams.get('sliderId');
	const tagId = $page.url.searchParams.get('tagId');
	const scheduleId = $page.url.searchParams.get('scheduleId');
	const eventScheduleSlug = $page.url.searchParams.get('eventScheduleSlug');

	let files: FileList | null = null;
	let fileName = '';

	let submitting = false;
	let formElement: HTMLFormElement;

	async function checkForm() {
		if (!files) {
			alert(t('admin.picture.selectFileAlert'));
			return;
		}

		submitting = true;
		// Need to load here, or for some reason, some inputs disappear afterwards
		const formData = new FormData(formElement);

		try {
			let index = 0;
			for (const file of files) {
				const pictureId = await preUploadPicture(data.adminPrefix, file, {
					fileName: `${fileName}-${index}`
				});

				formData.set(`pictureIds[${index}]`, pictureId);
				index++;
			}

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

	function onChange() {
		if (files && files.length > 0) {
			fileName = files[0].name;
		} else {
			fileName = '';
		}
	}
</script>

<h1 class="text-3xl">{t('admin.picture.addPicture')}</h1>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<form
	method="post"
	class="flex flex-col gap-4"
	bind:this={formElement}
	on:submit|preventDefault={checkForm}
>
	<fieldset class="contents" disabled={submitting}>
		<label class="form-label">
			{t('admin.picture.jpegOrPngFile')}
			<input
				type="file"
				bind:files
				on:change={onChange}
				accept="image/jpeg,image/png,image/webp"
				class="block"
				required
				multiple
			/>
		</label>

		<label class="form-label">
			{t('admin.picture.nameOfPicture')}
			<input
				class="form-input"
				type="text"
				name="name"
				placeholder={t('admin.picture.finalNamePlaceholder')}
				required
				bind:value={fileName}
			/>
		</label>

		{#if productId}
			<p>
				{t('admin.picture.associatedProduct')}
				<a href="{data.adminPrefix}/product/{productId}" class="hover:underline">{productId}</a>
			</p>
			<input type="hidden" name="productId" value={productId} />
		{/if}

		{#if sliderId}
			<p>
				{t('admin.picture.associatedSlider')}
				<a href="/admin/slider/{sliderId}" class="hover:underline">{sliderId}</a>
			</p>
			<input type="hidden" name="sliderId" value={sliderId} />
		{/if}
		{#if tagId}
			<label class="form-label w-full">
				{t('admin.picture.tagType')}
				<select name="tagType" class="form-input">
					{#each TAGTYPES as tagType}
						<option value={tagType}>{tagType}</option>
					{/each}
				</select>
			</label>
			<p>
				{t('admin.picture.associatedTag')}
				<a href="/admin/tags/{tagId}" class="hover:underline">{tagId}</a>
			</p>
			<input type="hidden" name="tagId" value={tagId} />
		{/if}
		{#if scheduleId}
			<p>
				{t('admin.picture.associatedSchedule')}
				<a href="/admin/schedule/{scheduleId}" class="hover:underline">{scheduleId}</a>
			</p>
			<p>{t('admin.picture.event', { eventScheduleSlug: eventScheduleSlug ?? '' })}</p>
			<input type="hidden" name="scheduleId" value={scheduleId} />
			<input type="hidden" name="eventScheduleSlug" value={eventScheduleSlug} />
		{/if}

		<input type="submit" class="btn body-mainCTA self-start" value={t('admin.picture.add')} />
	</fieldset>
</form>
