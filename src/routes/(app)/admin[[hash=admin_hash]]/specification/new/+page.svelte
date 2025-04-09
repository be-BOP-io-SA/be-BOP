<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	let title = '';
	let slug = '';
</script>

<h1 class="text-3xl">Add a specification</h1>

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
			required
		/>
	</label>
	Content

	<textarea
		name="content"
		cols="30"
		rows="10"
		maxlength={MAX_CONTENT_LIMIT}
		placeholder="Specifcation content"
		class="form-input block w-full"
	/>
	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
