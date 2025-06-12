<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage.js';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	export let data;
	let title = data.specification.title;
	let slug = data.specification._id;
	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this specification?')) {
			event.preventDefault();
		}
	}
</script>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		Title
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="title"
			placeholder="Specification title"
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
			disabled
		/>
	</label>
	Content

	<textarea
		name="content"
		cols="30"
		rows="10"
		maxlength={MAX_CONTENT_LIMIT}
		value={data.specification.content}
		placeholder="Specifcation content"
		class="form-input block w-full"
	/>
	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
		<a href="/specification/{data.specification._id}" class="btn body-mainCTA">View</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
