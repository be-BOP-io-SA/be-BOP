<script lang="ts">
	import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
	import PictureComponent from '$lib/components/Picture.svelte';

	export let data;

	let name = data.schedule.name;
	let slug = data.schedule._id;
	let displayPastEvents = data.schedule.displayPastEvents;
	let eventLines = data.schedule.events.length || 1;
	let eventAvailable = data.schedule.events.map((eve) => ({
		isUnavailable: eve.unavailabity?.isUnavailable ?? false
	}));
	let eventCalendar = data.schedule.events.map((eve) => ({
		calendarColor: !!eve.calendarColor
	}));
	let beginsAt: string[] = [];
	let endsAt: string[] = [];
	let hideAll = true;

	function confirmDelete(event: Event) {
		if (!confirm('Would you like to delete this schedule?')) {
			event.preventDefault();
		}
	}

	function deleteEventSchedule(title: string) {
		data.schedule.events = data.schedule.events.filter(
			(eventSchedule) => !(eventSchedule.title === title)
		);
		eventLines -= 1;
	}
	function closeAllDetails() {
		document.querySelectorAll('details[open]').forEach((el) => el.removeAttribute('open'));
	}
</script>

<h1 class="text-3xl">Edit a schedule</h1>

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
		Set desired delay for event with no end time (in minutes)
		<input
			class="form-input block"
			type="number"
			name="pastEventDelay"
			value={data.schedule.pastEventDelay}
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
			<input
				class="form-checkbox"
				type="checkbox"
				name="displayPastEventsAfterFuture"
				bind:checked={data.schedule.displayPastEventsAfterFuture}
			/>
			Show past events after future events
		</label>
	{/if}
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="sortByEventDateDesc"
			bind:checked={data.schedule.sortByEventDateDesc}
		/>
		sort by event date desc (default:asc)
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="allowSubscription"
			bind:checked={data.schedule.allowSubscription}
		/>
		Allow user to subscribe
	</label>
	<button class="btn btn-gray self-start" on:click={() => (hideAll = !hideAll)} type="button">
		{hideAll ? 'Expand all events' : 'Reduce all events'}
	</button>
	{#each [...Array(eventLines).keys()] as i}
		<details
			class="border border-gray-300 rounded-xl p-2"
			open={!hideAll || !data.schedule.events[i]}
		>
			<summary class="text-xl font-bold">
				<h1 class="items-center inline-flex gap-2">
					Event #{i + 1}
					{data.schedule.events[i] && data.schedule.events[i].title
						? ' - ' + data.schedule.events[i].title
						: ''}
					<button type="button" on:click={() => deleteEventSchedule(data.schedule.events[i].title)}
						>🗑️</button
					>
				</h1>
			</summary>
			<div class="flex flex-col gap-4 mt-2">
				{#if data.schedule.events && data.schedule.events.length >= i + 1}
					<label class="form-label">
						Title
						<input
							type="text"
							name="events[{i}].title"
							class="form-input"
							required
							value={data.schedule.events[i].title}
						/>
						<input
							type="hidden"
							name="events[{i}].slug"
							class="form-input"
							value={data.schedule.events[i].slug}
						/>
					</label>
					<label class="form-label">
						Short description
						<textarea
							name="events[{i}].shortDescription"
							cols="30"
							rows="2"
							maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
							class="form-input"
							value={data.schedule.events[i].shortDescription}
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
							value={data.schedule.events[i].description}
						/>
					</label>
					<div class="flex flex-wrap gap-4">
						<label class="form-label">
							Begins at

							<input
								class="form-input"
								type="datetime-local"
								name="events[{i}].beginsAt"
								value={(beginsAt[i] = new Date(data.schedule.events[i].beginsAt)
									.toISOString()
									.slice(0, 16))}
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
								value={data.schedule.events[i].endsAt !== null
									? new Date(data.schedule.events[i].endsAt ?? '').toISOString().slice(0, 16)
									: ''}
								min={beginsAt[i]}
							/>
							<span class="text-sm text-gray-600 mt-2 block">
								<kbd class="kbd">backspace</kbd> to remove the date.</span
							>
						</label>
					</div>
					<label class="form-label">
						Location name
						<input
							type="text"
							name="events[{i}].location.name"
							class="form-input"
							value={data.schedule.events[i].location?.name}
						/>
					</label>
					<label class="form-label">
						Location link
						<input
							type="text"
							name="events[{i}].location.link"
							class="form-input"
							value={data.schedule.events[i].location?.link}
						/>
					</label>
					<label class="form-label">
						Event url
						<input
							type="text"
							name="events[{i}].url"
							class="form-input"
							value={data.schedule.events[i].url}
						/>
					</label>
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="events[{i}].hideFromList"
							bind:checked={data.schedule.events[i].hideFromList}
						/>
						Hide event from list
					</label>
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="events[{i}].calendarHasCustomColor"
							bind:checked={eventCalendar[i].calendarColor}
						/>
						Event has custom color on calendar
					</label>
					{#if eventCalendar[i]?.calendarColor}
						<label class="form-label">
							Event color on calendar
							<input
								type="color"
								name="events[{i}].calendarColor"
								class="form-input"
								value={data.schedule.events[i].calendarColor}
							/>
						</label>
					{/if}
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="events[{i}].unavailabity.isUnavailable"
							bind:checked={eventAvailable[i].isUnavailable}
						/>
						Make event unavailable (postponed, cancelled, sold out)
					</label>
					{#if eventAvailable[i]?.isUnavailable}
						<input
							type="text"
							class="form-input"
							name="events[{i}].unavailabity.label"
							value={data.schedule.events[i].unavailabity?.label ?? ''}
						/>
					{/if}
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="events[{i}].isArchived"
							checked={data.schedule.events[i].isArchived}
						/>
						Archive event
					</label>
					<a
						href="{data.adminPrefix}/picture/new?scheduleId={data.schedule
							._id}&eventScheduleSlug={data.schedule.events[i].slug}"
						class="underline"
					>
						Add picture
					</a>

					<div class="flex flex-row flex-wrap gap-6 mt-6">
						{#each data.pictures.filter((pic) => pic.schedule && pic.schedule.eventSlug === data.schedule.events[i].slug) as picture}
							<div class="flex flex-col text-center">
								<a
									href="{data.adminPrefix}/picture/{picture._id}"
									class="flex flex-col items-center"
								>
									<PictureComponent {picture} class="h-36 block" style="object-fit: scale-down;" />
									<span>{picture.name}</span>
								</a>
							</div>
						{/each}
					</div>
				{:else}
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
					</label>
					<label class="form-label">
						Location link
						<input type="text" name="events[{i}].location.link" class="form-input" />
					</label>
					<label class="form-label">
						Event url
						<input type="text" name="events[{i}].url" class="form-input" />
					</label>
				{/if}
			</div>
		</details>
	{/each}
	<button class="btn btn-gray self-start" on:click={() => (eventLines += 1)} type="button"
		>Add another event
	</button>
	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" formaction="?/update" value="Update" />
		<a href="/schedule/{data.schedule._id}" class="btn btn-gray">View</a>
		<button class="btn btn-gray self-start" on:click={closeAllDetails} type="button">
			Hide details
		</button>
		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			formaction="?/delete"
			value="Delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
