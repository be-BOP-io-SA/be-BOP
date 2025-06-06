<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	export let data;
	let name = data.label.name;
	let slug = data.label._id;
	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this label?')) {
			event.preventDefault();
		}
	}
</script>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		Name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder="name"
			bind:value={name}
			on:change={() => (slug = generateId(name, true))}
			on:input={() => (slug = generateId(name, true))}
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
			disabled
		/>
	</label>
	<label class="form-label">
		Color
		<input
			class="form-input block"
			type="color"
			name="color"
			placeholder="#000000"
			value={data.label.color}
		/>
	</label>

	<label class="form-label">
		Content

		<textarea
			name="icon"
			cols="30"
			rows="5"
			maxlength={MAX_CONTENT_LIMIT}
			value={data.label.icon}
			class="form-input block w-full"
		/>
	</label>

	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
		<a href="/label/{data.label._id}" class="btn body-mainCTA">View</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
