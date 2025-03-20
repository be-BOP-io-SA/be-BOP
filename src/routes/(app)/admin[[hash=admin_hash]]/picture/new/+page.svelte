<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { TAGTYPES, preUploadPicture } from '$lib/types/Picture.js';

	export let data;

	const productId = $page.url.searchParams.get('productId');
	const sliderId = $page.url.searchParams.get('sliderId');
	const tagId = $page.url.searchParams.get('tagId');
	const scheduleId = $page.url.searchParams.get('scheduleId');
	const eventScheduleSlug = $page.url.searchParams.get('eventScheduleSlug');

	let files: FileList;
	let fileName = '';

	let submitting = false;
	let formElement: HTMLFormElement;

	async function checkForm() {
		submitting = true;
		// Need to load here, or for some reason, some inputs disappear afterwards
		const formData = new FormData(formElement);
		try {
			const pictureId = await preUploadPicture(data.adminPrefix, files[0], { fileName });

			formData.set('pictureId', pictureId);

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

<h1 class="text-3xl">Add a picture</h1>

<form
	method="post"
	class="flex flex-col gap-4"
	bind:this={formElement}
	on:submit|preventDefault={checkForm}
>
	<fieldset class="contents" disabled={submitting}>
		<label class="form-label">
			JPEG or PNG file
			<input
				type="file"
				bind:files
				on:change={() => {
					if (files && files.length > 0) {
						fileName = files[0].name;
					} else {
						fileName = '';
					}
				}}
				accept="image/jpeg,image/png,image/webp"
				class="block"
				required
			/>
		</label>

		<label class="form-label">
			Name of the picture
			<input
				class="form-input"
				type="text"
				name="name"
				placeholder="Final name"
				required
				bind:value={fileName}
			/>
		</label>

		{#if productId}
			<p>
				Associated product: <a href="{data.adminPrefix}/product/{productId}" class="hover:underline"
					>{productId}</a
				>
			</p>
			<input type="hidden" name="productId" value={productId} />
		{/if}

		{#if sliderId}
			<p>
				Associated slider: <a href="/admin/slider/{sliderId}" class="hover:underline">{sliderId}</a>
			</p>
			<input type="hidden" name="sliderId" value={sliderId} />
		{/if}
		{#if tagId}
			<label class="form-label w-full">
				Tag type
				<select name="tagType" class="form-input">
					{#each TAGTYPES as tagType}
						<option value={tagType}>{tagType}</option>
					{/each}
				</select>
			</label>
			<p>
				Associated tag: <a href="/admin/tags/{tagId}" class="hover:underline">{tagId}</a>
			</p>
			<input type="hidden" name="tagId" value={tagId} />
		{/if}
		{#if scheduleId}
			<p>
				Associated Schedule: <a href="/admin/schedule/{scheduleId}" class="hover:underline"
					>{scheduleId}</a
				>
			</p>
			<p>Event: {eventScheduleSlug}</p>
			<input type="hidden" name="scheduleId" value={scheduleId} />
			<input type="hidden" name="eventScheduleSlug" value={eventScheduleSlug} />
		{/if}

		<input type="submit" class="btn btn-gray self-start" value="Add" />
	</fieldset>
</form>
