<script lang="ts">
	import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';

	let name = '';
	let slug = '';
	let pastEventDelay = 60;
	let displayPastEvents = false;
	let calendarHasCustomColor = false;
	let rsvpOption = false;
	let eventLines = 1;
	let beginsAt: string[] = [];
	let endsAt: string[] = [];
</script>

<h1 class="text-3xl">Add a schedule</h1>

<form method="post" class="flex flex-col gap-4">
	<label class="form-label">
		Name
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder="schedule name"
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
		Set desired delay for event with no end time (in minutes)
		<input
			class="form-input block"
			type="number"
			name="pastEventDelay"
			bind:value={pastEventDelay}
		/>
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="displayPastEvents"
			bind:checked={displayPastEvents}
		/>
		Display past events
	</label>
	{#if displayPastEvents}
		<label class="checkbox-label">
			<input class="form-checkbox" type="checkbox" name="displayPastEventsAfterFuture" />
			Show past events after future events
		</label>
	{/if}
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="sortByEventDateDesc" />
		sort by event date desc (default:asc)
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="allowSubscription" />
		Allow user to subscribe
	</label>

	{#each [...Array(eventLines).keys()] as i}
		<h1 class="text-xl font-bold gap-2">Event #{i + 1}</h1>
		<label class="form-label">
			Title
			<input type="text" name="events[{i}].title" class="form-input" required />
		</label>
		<label class="form-label">
			Short description
			<textarea
				name="events[{i}].shortDescription"
				cols="30"
				rows="2"
				maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
				class="form-input"
			/>
		</label>
		<label class="form-label">
			Description
			<textarea
				name="events[{i}].description"
				cols="30"
				rows="10"
				maxlength="10000"
				class="block form-input"
			/>
		</label>
		<div class="flex flex-wrap gap-4">
			<label class="form-label">
				Begins at
				<input
					class="form-input"
					type="datetime-local"
					name="events[{i}].beginsAt"
					bind:value={beginsAt[i]}
					required
				/>
			</label>
		</div>
		<div class="flex flex-wrap gap-4">
			<label class="form-label">
				Ends at
				<input
					class="form-input"
					type="datetime-local"
					name="events[{i}].endsAt"
					bind:value={endsAt[i]}
					min={beginsAt[i]}
				/>
				<span class="text-sm text-gray-600 mt-2 block">
					<kbd class="kbd">backspace</kbd> to remove the date.</span
				>
			</label>
		</div>
		<label class="form-label">
			Location name
			<input type="text" name="events[{i}].location.name" class="form-input" />
		</label><label class="form-label">
			Location link
			<input type="text" name="events[{i}].location.link" class="form-input" />
		</label><label class="form-label">
			Event url
			<input type="text" name="events[{i}].url" class="form-input" />
		</label>
		<label class="checkbox-label">
			<input class="form-checkbox" type="checkbox" name="events[{i}].hideFromList" />
			Hide event from list
		</label>
		<label class="checkbox-label">
			<input
				class="form-checkbox"
				type="checkbox"
				name="events[{i}].rsvp.option"
				bind:checked={rsvpOption}
			/>
			Add RSVP option
		</label>
		{#if rsvpOption}
			<label class="form-label">
				Target
				<input type="text" name="events[{i}].rsvp.target" class="form-input" required />
			</label>
		{/if}
		<label class="checkbox-label">
			<input
				class="form-checkbox"
				type="checkbox"
				name="events[{i}].calendarHasCustomColor"
				bind:checked={calendarHasCustomColor}
			/>
			Event has custom color on calendar
		</label>
		{#if calendarHasCustomColor}
			<label class="form-label">
				Event color on calendar
				<input type="color" name="events[{i}].calendarColor" class="form-input" />
			</label>
		{/if}
	{/each}
	<button class="btn btn-gray self-start" on:click={() => (eventLines += 1)} type="button"
		>Add another event
	</button>

	<input type="submit" class="btn btn-blue self-start text-white" value="Submit" />
</form>
