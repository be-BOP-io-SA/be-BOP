<script lang="ts">
	import { generateId } from '$lib/utils/generateId';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preUploadPicture } from '$lib/types/Picture.js';
	import { page } from '$app/stores';

	export let data;
	let pageId = $page.url.searchParams.get('id') || null;
	let name = $page.url.searchParams.get('id')?.replaceAll('-', ' ') ?? '';
	let slug = pageId ?? '';
	let formElement: HTMLFormElement;
	let fileMainPicture: FileList;
	let fileFullPicture: FileList;
	let fileWideBanner: FileList;
	let fileSlimBanner: FileList;
	let fileAvatar: FileList;
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

<h1 class="text-3xl">Add a tag</h1>

<form
	method="post"
	class="flex flex-col gap-4"
	bind:this={formElement}
	on:submit|preventDefault={handleSubmit}
>
	<label class="form-label">
		tag name
		<input
			class="form-input"
			type="text"
			name="name"
			placeholder="Tag name"
			bind:value={name}
			on:change={() => (slug = generateId(name, false))}
			on:input={() => (slug = generateId(name, false))}
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
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="widgetUseOnly" />
		For widget use only
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="productTagging" />
		Available for product tagging
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="useLightDark" />
		Use light/dark inverted mode
	</label>
	<div class="flex flex-col gap-4 w-[20em]">
		<label class="form-label">
			Tag family
			<select class="form-input" name="family">
				{#each ['creators', 'events', 'retailers', 'temporal'] as family}
					<option value={family}>{upperFirst(family)}</option>
				{/each}
			</select>
		</label>
	</div>

	<label class="form-label">
		Tag title
		<input class="form-input" type="text" name="title" placeholder="Tag title" />
	</label>
	<label class="form-label">
		Tag subtitle
		<input class="form-input" type="text" name="subtitle" placeholder="Tag subtitle" />
	</label>
	<label class="form-label">
		Short content
		<textarea name="shortContent" cols="30" rows="2" class="form-input" />
	</label>
	<label class="form-label">
		Full content
		<textarea name="content" cols="30" rows="10" maxlength="10000" class="form-input" />
	</label>

	<input type="hidden" name="mainPictureId" />
	<label class="form-label">
		Main picture
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
		Full picture
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
		Wide banner
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
		Slim banner
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
		Avatar
		<input
			type="file"
			accept="image/jpeg,image/png,image/webp"
			class="block"
			bind:files={fileAvatar}
			disabled={submitting}
		/>
	</label>

	<h3 class="text-xl">CTAs</h3>
	{#each [...Array(tagCtaLines).fill( { label: '', href: '', openNewTab: false } )].slice(0, tagCtaLines) as cta, i}
		<div class="flex gap-4">
			<label class="form-label">
				Text
				<input type="text" name="cta[{i}].label" class="form-input" value={cta.label} />
			</label>
			<label class="form-label">
				Url
				<input type="text" name="cta[{i}].href" class="form-input" value={cta.href} />
			</label>
			<label class="checkbox-label mt-4">
				<input class="form-checkbox" type="checkbox" name="cta[{i}].openNewTab" />
				Open in new tab
			</label>
		</div>
	{/each}
	<button class="btn btn-gray self-start" on:click={() => (tagCtaLines += 1)} type="button"
		>Add CTAs
	</button>

	<label class="form-label">
		CSS override
		<textarea name="cssOverride" cols="30" rows="10" maxlength="10000" class="form-input" />
	</label>

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value="Submit"
		disabled={submitting}
	/>
</form>
