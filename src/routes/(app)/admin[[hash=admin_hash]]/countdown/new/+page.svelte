<script lang="ts">
	import { browser } from '$app/environment';
	import {
		MAX_DESCRIPTION_LIMIT,
		MAX_NAME_LIMIT,
		MAX_SHORT_DESCRIPTION_LIMIT
	} from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	let name: string;
	let slug: string;
	let endsAt = new Date().toISOString().slice(0, 16);

	const timezoneOffsetHours = new Date().getTimezoneOffset() / 60;
	const timezoneSign = timezoneOffsetHours > 0 ? '-' : '+';
	const timezoneString = `GMT${timezoneSign}${Math.abs(timezoneOffsetHours)}`;
</script>

<h1 class="text-3xl">Add a countdown</h1>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		Name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder="Countdown name"
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
		Title
		<textarea
			name="title"
			cols="30"
			rows="3"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			placeholder="Countdown title"
			class="form-input block w-full"
			required
		/>
	</label>
	<label class="form-label">
		Description
		<textarea
			name="description"
			cols="30"
			rows="10"
			maxlength={MAX_DESCRIPTION_LIMIT}
			placeholder="Countdown description"
			class="form-input block w-full"
			required
		/>
	</label>
	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			End At {#if browser}(your browser's current zone is {timezoneString}){/if}
			<input class="form-input" type="datetime-local" required name="endsAt" bind:value={endsAt} />
		</label>
	</div>
	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
