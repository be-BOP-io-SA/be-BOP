<script lang="ts">
	import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
	import PictureComponent from '$lib/components/Picture.svelte';
	import { CURRENCIES } from '$lib/types/Currency';
	import { applyAction, enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preUploadPicture } from '$lib/types/Picture.js';
	import Select from 'svelte-select';
	import { browser } from '$app/environment';

	export let data;

	let name = data.schedule.name;
	let slug = data.schedule._id;
	let displayPastEvents = data.schedule.displayPastEvents;
	let eventLines = data.schedule.events.length || 1;
	$: eventAvailable = data.schedule.events.map((eve) => ({
		isUnavailable: eve.unavailabity?.isUnavailable ?? false
	}));
	$: eventCalendar = data.schedule.events.map((eve) => ({
		calendarColor: !!eve.calendarColor
	}));
	$: rsvpOptions = data.schedule.events.map((eve) => ({
		option: !!eve.rsvp?.target
	}));
	$: createATicket = data.schedule.events.map(() => false);
	let beginsAt: string[] = [];
	let endsAt: string[] = [];
	let hideAll = true;

	let limitedStock = false;
	let nonFreePrice = false;
	let errorMessage = data.schedule.events.map(() => '');
	let loading = false;
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
	function closeDetailByIndex(i: number) {
		const detail = document.getElementById(`detail-${i}`);
		if (detail?.hasAttribute('open')) {
			detail.removeAttribute('open');
		}
	}
	let calendarHasCustomColor = false;
	let rsvpOption = false;
	let submitting = false;
	let eventPictures: FileList[] = [];
	let formElement: HTMLFormElement;

	function handleFileChange(event: Event, index: number) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			eventPictures[index] = target.files;
		}
	}
	async function handleSubmit(event: SubmitEvent) {
		submitting = true;
		const formData = new FormData(formElement);
		try {
			await Promise.all(
				eventPictures.map(async (picture, index) => {
					if (picture) {
						const pictureId = await preUploadPicture(data.adminPrefix, picture[0], {
							fileName: name
						});
						formData.set(`eventPictures[${index}]`, pictureId);
					}
				})
			);
			const action = (event.submitter as HTMLButtonElement | null)?.formAction.includes('?/')
				? (event.submitter as HTMLButtonElement).formAction
				: formElement.action;

			const finalResponse = await fetch(action, {
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
	let hasTimezone = !!data.schedule.timezone;
	const timezones = Intl.supportedValuesOf('timeZone').map((tz, index) => ({
		index,
		value: tz,
		label: tz
	}));
	const defaultTz = data.schedule.timezone;
	let selectedTimezone = timezones.find((tz) => tz.value === defaultTz) ?? null;
	const timezoneOffsetHours = new Date().getTimezoneOffset() / 60;
	const timezoneSign = timezoneOffsetHours > 0 ? '-' : '+';
	const timezoneString = `GMT${timezoneSign}${Math.abs(timezoneOffsetHours)}`;
</script>

<h1 class="text-3xl">Edit a schedule</h1>

<form
	method="post"
	class="flex flex-col gap-4"
	bind:this={formElement}
	action="?/update"
	on:submit|preventDefault={handleSubmit}
>
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
	<small class="text-sm text-gray-500 block">
		To use in a CMS zone, use <kbd class="kbd body-secondaryCTA">[Schedule={slug}]</kbd> or
		<kbd class="kbd body-secondaryCTA">[Schedule={slug} display=calendar]</kbd>
	</small>
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
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" bind:checked={hasTimezone} />
		Set GMT timezone instead of server timezone
	</label>
	{#if hasTimezone}
		{#if browser}(your browser's current zone is {timezoneString}){/if}
		<Select
			items={timezones}
			searchable={true}
			placeholder="Select a timezone"
			clearable={true}
			bind:value={selectedTimezone}
			class="form-input"
		/>
		<input type="hidden" name="timezone" value={selectedTimezone?.value} />
	{/if}

	<button class="btn btn-gray self-start" on:click={() => (hideAll = !hideAll)} type="button">
		{hideAll ? 'Expand all events' : 'Reduce all events'}
	</button>
	{#each [...Array(eventLines).keys()] as i}
		<details
			class="border border-gray-300 rounded-xl p-2"
			open={!hideAll || !data.schedule.events[i]}
			id="detail-{i}"
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
				{#if errorMessage[i]}
					<p class="text-red-500">{errorMessage[i]}</p>
				{/if}
				{#if data.schedule.events && data.schedule.events.length >= i + 1}
					{#if !data.schedule.events[i].productId || !data.schedule.events[i].url?.startsWith('/product')}
						<form
							on:submit={() => (loading = true)}
							method="post"
							class="flex flex-col gap-4"
							use:enhance={() => {
								errorMessage[i] = '';
								return async ({ result }) => {
									loading = false;

									if (result.type === 'error') {
										errorMessage[i] = result.error.message;
										return;
									}
									if (result.type === 'success' && result.data?.['redirectUrl']) {
										// rerun all `load` functions, following the successful update
										await invalidateAll();
										window.open(result.data?.['redirectUrl'].toString(), '_blank');
									}
								};
							}}
						>
							<button
								class="btn {createATicket[i] ? 'btn-red' : 'btn-gray'} self-start"
								on:click={() => (createATicket[i] = !createATicket[i])}
								type="button"
								>{createATicket[i] ? 'Cancel ticket creation' : 'Create a ticket product'}
							</button>
							{#if createATicket[i]}
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="useTitleDateAsShortDesc" />
									Use title and date as short description
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="displayShortDescription" />
									Display short description on product
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="exportEventToCalendar" />
									Create CTA for exporting event to calendar
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="locationUrlCta" />
									Create a CTA for location URL if not empty
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="overwriteEventUrl" />
									Overwrite event URL information with product URL
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="CTAForMoreInformation" />
									Create a CTA for event URL ('More Information') if not empty
								</label>
								<label class="checkbox-label">
									<input
										class="form-checkbox"
										type="checkbox"
										name="nonFreePrice"
										bind:checked={nonFreePrice}
									/>
									Set non-free price
								</label>
								{#if nonFreePrice}
									<div class="gap-4 flex flex-col md:flex-row">
										<label class="w-full">
											Price amount
											<input
												class="form-input"
												type="number"
												name="priceAmount"
												placeholder="Price"
												step="any"
												required
											/>
										</label>

										<label class="w-full">
											Price currency

											<select name="priceCurrency" class="form-input">
												{#each CURRENCIES as currency}
													<option value={currency} selected={data.currencies.main === currency}
														>{currency}</option
													>
												{/each}
											</select>
										</label>
									</div>
								{/if}
								<label class="checkbox-label">
									<input
										class="form-checkbox"
										type="checkbox"
										name="limitedStock"
										bind:checked={limitedStock}
									/>
									Use limited stock
								</label>
								{#if limitedStock}
									<label class="form-label">
										Stock
										<input
											class="form-input"
											type="number"
											name="stock"
											placeholder="Stock"
											step="1"
											min="0"
										/>
									</label>
								{/if}
								<button
									class="btn btn-blue self-start"
									type="submit"
									disabled={loading}
									formaction="{data.adminPrefix}/schedule/{data.schedule._id}/event/{data.schedule
										.events[i].slug}?/creatTicket"
									>Confirm ticket creation
								</button>
							{/if}
						</form>
					{/if}
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
								<kbd class="kbd body-secondaryCTA">backspace</kbd> to remove the date.</span
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
							name="events[{i}].rsvp.option"
							bind:checked={rsvpOptions[i].option}
						/>
						Add RSVP option
					</label>
					{#if rsvpOptions[i].option}
						<label class="form-label">
							Target
							<input
								type="text"
								name="events[{i}].rsvp.target"
								class="form-input"
								required
								value={data.schedule.events[i].rsvp?.target ||
									data.sellerIdentity?.contact.email ||
									''}
							/>
						</label>
					{/if}
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

					<div class="flex flex-row justify-between gap-2">
						<input
							type="submit"
							class="btn btn-blue text-white"
							formaction="?/update"
							value="Update"
						/>
						<button
							class="btn body-mainCTA self-start"
							on:click={() => closeDetailByIndex(i)}
							type="button"
						>
							Hide details
						</button>
						<input
							type="button"
							class="btn btn-red text-white ml-auto"
							value="Delete"
							on:click={() => {
								deleteEventSchedule(data.schedule.events[i].title);
								closeDetailByIndex(i);
							}}
						/>
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
								<kbd class="kbd body-secondaryCTA">backspace</kbd> to remove the date.</span
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
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						class="block"
						on:change={(e) => handleFileChange(e, i - (data.schedule.events.length || 1))}
						disabled={submitting}
					/>
				{/if}
			</div>
		</details>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (eventLines += 1)} type="button"
		>Add another event
	</button>
	<div class="flex flex-row justify-between gap-2">
		<input type="submit" class="btn btn-blue text-white" value="Update" disabled={submitting} />
		<a href="/schedule/{data.schedule._id}" class="btn body-mainCTA">View</a>
		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			value="Delete"
			formaction="?/delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
