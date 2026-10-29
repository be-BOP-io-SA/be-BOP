<script lang="ts">
	import { preUploadPicture } from '$lib/types/Picture';
	import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
	import { generateId } from '$lib/utils/generateId';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import Select from 'svelte-select';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	let name = '';
	let slug = '';
	let pastEventDelay = 60;
	let displayPastEvents = false;
	let calendarHasCustomColor = false;
	let rsvpOption = false;
	let eventLines = 1;
	let beginsAt: string[] = [];
	let endsAt: string[] = [];
	let submitting = false;
	let eventPictures: FileList[] = [];
	let formElement: HTMLFormElement;

	function handleFileChange(event: Event, index: number) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			eventPictures[index] = target.files;
		}
	}
	async function handleSubmit() {
		try {
			submitting = true;
			const formData = new FormData(formElement);

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

			const finalResponse = await fetch(formElement.action, {
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
	let hasTimezone = false;
	const timezones = Intl.supportedValuesOf('timeZone').map((tz, index) => ({
		index,
		value: tz,
		label: tz
	}));

	const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

	let selectedTimezone = timezones.find((tz) => tz.value === defaultTz) ?? null;
	const timezoneOffsetHours = new Date().getTimezoneOffset() / 60;
	const timezoneSign = timezoneOffsetHours > 0 ? '-' : '+';
	const timezoneString = `GMT${timezoneSign}${Math.abs(timezoneOffsetHours)}`;
</script>

<h1 class="text-3xl">{t('admin.schedule.addScheduleTitle')}</h1>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<form
	method="post"
	class="flex flex-col gap-4"
	on:submit|preventDefault={handleSubmit}
	bind:this={formElement}
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
			on:change={() => (slug = generateId(name, true))}
			on:input={() => (slug = generateId(name, true))}
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
			required
		/>
	</label>
	<label class="form-label">
		{t('admin.schedule.pastEventDelayLabel')}
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
		{t('admin.schedule.displayPastEvents')}
	</label>
	{#if displayPastEvents}
		<label class="checkbox-label">
			<input class="form-checkbox" type="checkbox" name="displayPastEventsAfterFuture" />
			{t('admin.schedule.displayPastEventsAfterFuture')}
		</label>
	{/if}
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="sortByEventDateDesc" />
		{t('admin.schedule.sortByEventDateDesc')}
	</label>
	<label class="checkbox-label">
		<input class="form-checkbox" type="checkbox" name="allowSubscription" />
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

	{#each [...Array(eventLines).keys()] as i}
		<h1 class="text-xl font-bold gap-2">{t('admin.schedule.eventNumber', { number: i + 1 })}</h1>
		<label class="form-label">
			{t('admin.schedule.eventTitle')}
			<input type="text" name="events[{i}].title" class="form-input" required />
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
		</label><label class="form-label">
			{t('admin.schedule.locationLink')}
			<input type="text" name="events[{i}].location.link" class="form-input" />
		</label><label class="form-label">
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
			on:change={(e) => handleFileChange(e, i)}
			disabled={submitting}
		/>
	{/each}
	<button class="btn body-mainCTA self-start" on:click={() => (eventLines += 1)} type="button"
		>{t('admin.schedule.addAnotherEvent')}
	</button>

	<input
		type="submit"
		class="btn btn-blue self-start text-white"
		value={t('admin.schedule.submit')}
		disabled={submitting}
	/>
</form>
