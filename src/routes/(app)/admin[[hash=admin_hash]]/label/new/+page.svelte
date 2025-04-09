<script lang="ts">
	import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
	import { MAX_NAME_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	let name = '';
	let slug = '';
</script>

<h1 class="text-3xl">Add a label</h1>

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
			required
		/>
	</label>

	<label class="form-label">
		Color
		<input class="form-input block" type="color" name="color" placeholder="#000000" required />
	</label>

	Icon
	<label class="form-label">
		<textarea
			name="icon"
			cols="30"
			rows="5"
			maxlength={MAX_CONTENT_LIMIT}
			placeholder="icon svg or emoji"
			class="form-input block w-full"
		/>
	</label>
	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
