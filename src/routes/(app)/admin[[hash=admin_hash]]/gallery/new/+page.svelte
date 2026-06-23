<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preUploadPicture } from '$lib/types/Picture';
	import { generateId } from '$lib/utils/generateId';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';

	export let data;
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

<h1 class="text-3xl">Add a gallery</h1>

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
		Gallery name
		<input
			class="form-input"
			type="text"
			name="name"
			placeholder="Gallery name"
			bind:value={name}
			on:change={() => (slug = generateId(name, false))}
			on:input={() => (slug = generateId(name, false))}
			required
		/>
	</label>
	<label class="form-label">
		Gallery slug
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
	<h3 class="text-xl">Principal Gallery</h3>
	<label class="form-label">
		Gallery title
		<input class="form-input" type="text" name="principal.title" placeholder="Gallery title" />
	</label>
	<label class="form-label">
		Gallery content
		<textarea name="principal.content" cols="30" rows="5" maxlength="10000" class="form-input" />
	</label>
	<div class="flex gap-4">
		<label class="form-label">
			Text
			<input type="text" name="principal.cta.label" class="form-input" />
		</label>
		<label class="form-label">
			Url
			<input type="text" name="principal.cta.href" class="form-input" />
		</label>
		<label class="checkbox-label mt-4">
			<input class="form-checkbox" type="checkbox" name="principal.cta.openNewTab" />
			Open in new tab
		</label>
	</div>

	<h3 class="text-xl">Secondary Gallery</h3>
	{#each [0, 1, 2] as i}
		<label class="form-label">
			Gallery subtitle {i + 1}
			<input
				class="form-input"
				type="text"
				name="secondary[{i}].title"
				placeholder="Gallery title"
				maxlength="30"
			/>
		</label>
		<label class="form-label">
			Gallery subcontent {i + 1}
			<textarea
				name="secondary[{i}].content"
				cols="30"
				rows="5"
				maxlength="160"
				class="form-input"
			/>
		</label>
		<label class="form-label">
			Picture {i + 1}
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
				Text
				<input type="text" name="secondary[{i}].cta.label" class="form-input" />
			</label>
			<label class="form-label">
				Url
				<input type="text" name="secondary[{i}].cta.href" class="form-input" />
			</label>
			<label class="checkbox-label mt-4">
				<input class="form-checkbox" type="checkbox" name="secondary[{i}].cta.openNewTab" />
				Open in new tab
			</label>
		</div>
	{/each}

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value="Submit"
		disabled={submitting}
	/>
</form>
