<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preUploadPicture } from '$lib/types/Picture';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	export let data;

	let submitting = false;
	let files: FileList | null = null;
	let formElement: HTMLFormElement;

	let title = '';
	let slug = '';

	async function checkForm() {
		submitting = true;
		// Need to load here, or for some reason, some inputs disappear afterwards
		const formData = new FormData(formElement);
		if (!files || files.length === 0) {
			alert('Please select a file');
			return;
		}
		try {
			const pictureId = await preUploadPicture(data.adminPrefix, files[0], {
				fileName: title
			});

			formData.set('sliderPictureId', pictureId);

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

<h1 class="text-3xl">Add a slider</h1>

<form
	method="post"
	class="flex flex-col gap-4"
	bind:this={formElement}
	on:submit|preventDefault={checkForm}
>
	<label class="form-label">
		Slider title
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="title"
			placeholder="Slider title"
			bind:value={title}
			on:change={() => (slug = generateId(title, true))}
			on:input={() => (slug = generateId(title, true))}
			required
		/>
	</label>

	<label class="form-label">
		Slug

		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder="Slug"
			bind:value={slug}
			title="Only lowercase letters, numbers and dashes are allowed"
			required
		/>
	</label>

	<input type="hidden" name="sliderPictureId" />
	<label class="form-label">
		Picture
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="block"
			bind:files
			required
			disabled={submitting}
		/>
	</label>

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		disabled={submitting}
		value="Submit"
	/>
</form>
