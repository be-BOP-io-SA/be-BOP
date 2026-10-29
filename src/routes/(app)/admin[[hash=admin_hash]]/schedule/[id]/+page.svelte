<script lang="ts">
	import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
	import PictureComponent from '$lib/components/Picture.svelte';
	import { sortCurrencies, currenciesToSelectOptions } from '$lib/types/Currency';
	import { applyAction, enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { preUploadPicture } from '$lib/types/Picture.js';
	import Select from 'svelte-select';
	import { browser } from '$app/environment';
	import CurrencyLabel from '$lib/components/CurrencyLabel.svelte';
	import { currencies } from '$lib/stores/currencies';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

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
	let rsvpOptions = data.schedule.events.map((eve) => ({
		option: !!eve.rsvp?.target
	}));
	let createATicket = data.schedule.events.map(() => false);

	$: if (data.schedule.events.length !== eventAvailable.length) {
		eventAvailable = data.schedule.events.map((eve) => ({
			isUnavailable: eve.unavailabity?.isUnavailable ?? false
		}));
		eventCalendar = data.schedule.events.map((eve) => ({
			calendarColor: !!eve.calendarColor
		}));
		rsvpOptions = data.schedule.events.map((eve) => ({
			option: !!eve.rsvp?.target
		}));
		createATicket = data.schedule.events.map(() => false);
		errorMessage = data.schedule.events.map(() => '');
		eventLines = data.schedule.events.length;
	}

	let beginsAt: string[] = [];
	let endsAt: string[] = [];
	let hideAll = true;

	let limitedStock = false;
	let nonFreePrice = false;
	let errorMessage = data.schedule.events.map(() => '');
	let loading = false;
	function confirmDelete(event: Event) {
		if (!confirm(t('admin.schedule.confirmDeleteSchedule'))) {
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

	// Currency options for ticket pricing Select component (sorted: main → secondary → BTC/SAT → fiat A-Z)
	const sortedCurrencies = sortCurrencies($currencies.main, $currencies.secondary);
	const allCurrenciesOptions = currenciesToSelectOptions(sortedCurrencies);
	let selectedTicketCurrency =
		allCurrenciesOptions.find((c) => c.value === data.currencies.main) || null;

	function handleInvalidInput(event: Event) {
		const target = event.target as HTMLInputElement;
		// Find and open the parent <details> element so the browser can focus the invalid input
		const detailsParent = target.closest('details');
		if (detailsParent && !detailsParent.hasAttribute('open')) {
			detailsParent.setAttribute('open', '');
		}
	}
</script>

<h1 class="text-3xl">{t('admin.schedule.editScheduleTitle')}</h1>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<form
	method="post"
	class="flex flex-col gap-4"
	bind:this={formElement}
	action="?/update"
	on:submit|preventDefault={handleSubmit}
>
	<label class="form-label">
		{t('admin.schedule.name')}
		<input
			class="form-input"
			type="text"
			maxlength={MAX_NAME_LIMIT}
			name="name"
			placeholder={t('admin.schedule.namePlaceholder')}
			bind:value={name}
			required
		/>
	</label>
	<label class="form-label">
		{t('admin.schedule.slug')}
		<input
			class="form-input block"
			type="text"
			name="slug"
			placeholder={t('admin.schedule.slug')}
			bind:value={slug}
			title={t('admin.schedule.slugFormatHint')}
			disabled
		/>
	</label>
	<small class="text-sm text-gray-500 block">
		{t('admin.schedule.cmsZoneHintPrefix')}
		<kbd class="kbd body-secondaryCTA">[Schedule={slug}]</kbd>
		{t('admin.schedule.cmsZoneHintOr')}
		<kbd class="kbd body-secondaryCTA">[Schedule={slug} display=calendar]</kbd>
	</small>
	<label class="form-label">
		{t('admin.schedule.pastEventDelayLabel')}
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
		{t('admin.schedule.displayPastEvents')}
	</label>
	{#if displayPastEvents}
		<label class="checkbox-label">
			<input
				class="form-checkbox"
				type="checkbox"
				name="displayPastEventsAfterFuture"
				bind:checked={data.schedule.displayPastEventsAfterFuture}
			/>
			{t('admin.schedule.displayPastEventsAfterFuture')}
		</label>
	{/if}
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="sortByEventDateDesc"
			bind:checked={data.schedule.sortByEventDateDesc}
		/>
		{t('admin.schedule.sortByEventDateDesc')}
	</label>
	<label class="checkbox-label">
		<input
			class="form-checkbox"
			type="checkbox"
			name="allowSubscription"
			bind:checked={data.schedule.allowSubscription}
		/>
		{t('admin.schedule.allowSubscription')}
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" bind:checked={hasTimezone} />
		{t('admin.schedule.setGmtTimezone')}
	</label>
	{#if hasTimezone}
		{#if browser}{t('admin.schedule.browserTimezoneHint', { timezoneString })}{/if}
		<Select
			items={timezones}
			searchable={true}
			placeholder={t('admin.schedule.selectTimezonePlaceholder')}
			clearable={true}
			bind:value={selectedTimezone}
			class="form-input"
		/>
		<input type="hidden" name="timezone" value={selectedTimezone?.value} />
	{/if}

	<button class="btn btn-gray self-start" on:click={() => (hideAll = !hideAll)} type="button">
		{hideAll ? t('admin.schedule.expandAllEvents') : t('admin.schedule.reduceAllEvents')}
	</button>
	{#each [...Array(eventLines).keys()] as i}
		<details
			class="border border-gray-300 rounded-xl p-2"
			open={!hideAll || !data.schedule.events[i] || !!errorMessage[i]}
			id="detail-{i}"
		>
			<summary class="text-xl font-bold">
				<h1 class="items-center inline-flex gap-2">
					{t('admin.schedule.eventNumber', { number: i + 1 })}
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
								>{createATicket[i]
									? t('admin.schedule.cancelTicketCreation')
									: t('admin.schedule.createTicketProduct')}
							</button>
							{#if createATicket[i]}
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="useTitleDateAsShortDesc" />
									{t('admin.schedule.useTitleDateAsShortDesc')}
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="displayShortDescription" />
									{t('admin.schedule.displayShortDescriptionOnProduct')}
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="exportEventToCalendar" />
									{t('admin.schedule.createExportCalendarCta')}
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="locationUrlCta" />
									{t('admin.schedule.createLocationUrlCta')}
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="overwriteEventUrl" />
									{t('admin.schedule.overwriteEventUrlWithProductUrl')}
								</label>
								<label class="checkbox-label">
									<input class="form-checkbox" type="checkbox" name="CTAForMoreInformation" />
									{t('admin.schedule.createMoreInfoCta')}
								</label>
								<label class="checkbox-label">
									<input
										class="form-checkbox"
										type="checkbox"
										name="nonFreePrice"
										bind:checked={nonFreePrice}
									/>
									{t('admin.schedule.setNonFreePrice')}
								</label>
								{#if nonFreePrice}
									<div class="gap-4 flex flex-col md:flex-row">
										<label class="w-full">
											{t('admin.schedule.priceAmount')}
											<input
												class="form-input"
												type="number"
												name="priceAmount"
												placeholder={t('admin.schedule.pricePlaceholder')}
												step="any"
												required
											/>
										</label>

										<label class="w-full">
											<CurrencyLabel label={t('admin.schedule.priceCurrency')} />
											<Select
												items={allCurrenciesOptions}
												searchable={true}
												clearable={false}
												bind:value={selectedTicketCurrency}
												class="form-input"
											/>
											<input
												type="hidden"
												name="priceCurrency"
												value={selectedTicketCurrency?.value || ''}
												required
											/>
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
									{t('admin.schedule.useLimitedStock')}
								</label>
								{#if limitedStock}
									<label class="form-label">
										{t('admin.schedule.stock')}
										<input
											class="form-input"
											type="number"
											name="stock"
											placeholder={t('admin.schedule.stock')}
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
									>{t('admin.schedule.confirmTicketCreation')}
								</button>
							{/if}
						</form>
					{/if}
					<label class="form-label">
						{t('admin.schedule.eventTitle')}
						<input
							type="text"
							name="events[{i}].title"
							class="form-input"
							required
							value={data.schedule.events[i].title}
							on:invalid={handleInvalidInput}
						/>
						<input
							type="hidden"
							name="events[{i}].slug"
							class="form-input"
							value={data.schedule.events[i].slug}
						/>
					</label>
					<label class="form-label">
						{t('admin.schedule.shortDescription')}
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
						{t('admin.schedule.description')}
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
							{t('admin.schedule.beginsAt')}

							<input
								class="form-input"
								type="datetime-local"
								name="events[{i}].beginsAt"
								value={(beginsAt[i] = new Date(data.schedule.events[i].beginsAt)
									.toISOString()
									.slice(0, 16))}
								required
								on:invalid={handleInvalidInput}
							/>
						</label>
					</div>
					<div class="flex flex-wrap gap-4">
						<label class="form-label">
							{t('admin.schedule.endsAt')}

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
								<kbd class="kbd body-secondaryCTA">backspace</kbd>
								{t('admin.schedule.toRemoveDate')}</span
							>
						</label>
					</div>
					<label class="form-label">
						{t('admin.schedule.locationName')}
						<input
							type="text"
							name="events[{i}].location.name"
							class="form-input"
							value={data.schedule.events[i].location?.name}
						/>
					</label>
					<label class="form-label">
						{t('admin.schedule.locationLink')}
						<input
							type="text"
							name="events[{i}].location.link"
							class="form-input"
							value={data.schedule.events[i].location?.link}
						/>
					</label>
					<label class="form-label">
						{t('admin.schedule.eventUrl')}
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
						{t('admin.schedule.hideEventFromList')}
					</label>
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="events[{i}].rsvp.option"
							bind:checked={rsvpOptions[i].option}
						/>
						{t('admin.schedule.addRsvpOption')}
					</label>
					{#if rsvpOptions[i].option}
						<label class="form-label">
							{t('admin.schedule.rsvpTarget')}
							<input
								type="text"
								name="events[{i}].rsvp.target"
								class="form-input"
								required
								value={data.schedule.events[i].rsvp?.target ||
									data.sellerIdentity?.contact.email ||
									''}
								on:invalid={handleInvalidInput}
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
						{t('admin.schedule.eventHasCustomColor')}
					</label>
					{#if eventCalendar[i]?.calendarColor}
						<label class="form-label">
							{t('admin.schedule.eventColorLabel')}
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
						{t('admin.schedule.makeEventUnavailable')}
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
						{t('admin.schedule.archiveEvent')}
					</label>
					<a
						href="{data.adminPrefix}/picture/new?scheduleId={data.schedule
							._id}&eventScheduleSlug={data.schedule.events[i].slug}"
						class="underline"
					>
						{t('admin.schedule.addPicture')}
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
							value={t('admin.action.update')}
						/>
						<button
							class="btn body-mainCTA self-start"
							on:click={() => closeDetailByIndex(i)}
							type="button"
						>
							{t('admin.schedule.hideDetails')}
						</button>
						<input
							type="button"
							class="btn btn-red text-white ml-auto"
							value={t('admin.schedule.delete')}
							on:click={() => {
								deleteEventSchedule(data.schedule.events[i].title);
								closeDetailByIndex(i);
							}}
						/>
					</div>
				{:else}
					<label class="form-label">
						{t('admin.schedule.eventTitle')}
						<input
							type="text"
							name="events[{i}].title"
							class="form-input"
							required
							on:invalid={handleInvalidInput}
						/>
					</label>
					<label class="form-label">
						{t('admin.schedule.shortDescription')}
						<textarea
							name="events[{i}].shortDescription"
							cols="30"
							rows="2"
							maxlength={MAX_SHORT_DESCRIPTION_LIMIT}
							class="form-input"
						/>
					</label>
					<label class="form-label">
						{t('admin.schedule.description')}
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
							{t('admin.schedule.beginsAt')}
							<input
								class="form-input"
								type="datetime-local"
								name="events[{i}].beginsAt"
								bind:value={beginsAt[i]}
								required
								on:invalid={handleInvalidInput}
							/>
						</label>
					</div>
					<div class="flex flex-wrap gap-4">
						<label class="form-label">
							{t('admin.schedule.endsAt')}
							<input
								class="form-input"
								type="datetime-local"
								name="events[{i}].endsAt"
								bind:value={endsAt[i]}
								min={beginsAt[i]}
							/>
							<span class="text-sm text-gray-600 mt-2 block">
								<kbd class="kbd body-secondaryCTA">backspace</kbd>
								{t('admin.schedule.toRemoveDate')}</span
							>
						</label>
					</div>
					<label class="form-label">
						{t('admin.schedule.locationName')}
						<input type="text" name="events[{i}].location.name" class="form-input" />
					</label>
					<label class="form-label">
						{t('admin.schedule.locationLink')}
						<input type="text" name="events[{i}].location.link" class="form-input" />
					</label>
					<label class="form-label">
						{t('admin.schedule.eventUrl')}
						<input type="text" name="events[{i}].url" class="form-input" />
					</label>
					<label class="checkbox-label">
						<input class="form-checkbox" type="checkbox" name="events[{i}].hideFromList" />
						{t('admin.schedule.hideEventFromList')}
					</label>
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="events[{i}].rsvp.option"
							bind:checked={rsvpOption}
						/>
						{t('admin.schedule.addRsvpOption')}
					</label>
					{#if rsvpOption}
						<label class="form-label">
							{t('admin.schedule.rsvpTarget')}
							<input
								type="text"
								name="events[{i}].rsvp.target"
								class="form-input"
								required
								on:invalid={handleInvalidInput}
							/>
						</label>
					{/if}
					<label class="checkbox-label">
						<input
							class="form-checkbox"
							type="checkbox"
							name="events[{i}].calendarHasCustomColor"
							bind:checked={calendarHasCustomColor}
						/>
						{t('admin.schedule.eventHasCustomColor')}
					</label>
					{#if calendarHasCustomColor}
						<label class="form-label">
							{t('admin.schedule.eventColorLabel')}
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
		>{t('admin.schedule.addAnotherEvent')}
	</button>
	<div class="flex flex-row justify-between gap-2">
		<input
			type="submit"
			class="btn btn-blue text-white"
			value={t('admin.action.update')}
			disabled={submitting}
		/>
		<a href="/schedule/{data.schedule._id}" class="btn body-mainCTA">{t('admin.schedule.view')}</a>
		<input
			type="submit"
			class="btn btn-red text-white ml-auto"
			value={t('admin.schedule.delete')}
			formaction="?/delete"
			on:click={confirmDelete}
		/>
	</div>
</form>
