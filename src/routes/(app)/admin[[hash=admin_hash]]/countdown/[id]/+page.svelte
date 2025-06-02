<script lang="ts">
	import { browser } from '$app/environment';
	import {
		MAX_DESCRIPTION_LIMIT,
		MAX_NAME_LIMIT,
		MAX_SHORT_DESCRIPTION_LIMIT
	} from '$lib/types/Product';

	export let data;
	let name = data.countdown.name;
	let slug = data.countdown._id;

	const timezoneOffsetHours = new Date().getTimezoneOffset() / 60;
	const timezoneSign = timezoneOffsetHours > 0 ? '-' : '+';
	const timezoneString = `GMT${timezoneSign}${Math.abs(timezoneOffsetHours)}`;

	let endsAt = data.countdown.endsAt.toISOString().slice(0, 16);

	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this countdown?')) {
			event.preventDefault();
		}
	}
</script>

<form method="post" class="flex flex-col gap-4" action="?/update">
	<label class="form-label">
		Name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder="Countdown name"
			bind:value={name}
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
		Title
		<textarea
			name="title"
			cols="30"
			rows="3"
			maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
			placeholder="Countdown title"
			class="form-input block w-full"
			value={data.countdown.title}
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
			value={data.countdown.description}
			required
		/>
	</label>

	<div class="flex flex-wrap gap-4">
		<label class="form-label">
			End At {#if browser}(your browser's current zone is {timezoneString}){/if}
			<input class="form-input" type="datetime-local" required name="endsAt" bind:value={endsAt} />
		</label>
	</div>
	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
		<a href="/countdown/{data.countdown._id}" class="btn body-mainCTA">View</a>

		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
