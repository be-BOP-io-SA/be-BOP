<script lang="ts">
	import type { EventSchedule, Schedule } from '$lib/types/Schedule';
	import { useI18n } from '$lib/i18n';
	import { upperFirst } from '$lib/utils/upperFirst';
	import IconRssFeed from '../icons/IconRssFeed.svelte';
	import { addDays, format, isSameDay } from 'date-fns';
	import IcsExport from './IcsExport.svelte';

	export let schedule: Schedule;
	let className = '';
	export { className as class };

	const { t, locale } = useI18n();

	$: dateFilter = '';
	$: locationFilter = '';
	$: nameFilter = '';
	$: descriptionFilter = '';

	let scheduleEventByDay: Record<string, EventSchedule[]> = {};
	for (const event of schedule.events) {
		const startDate = new Date(event.beginsAt);
		const endDate = event.endsAt ? new Date(event.endsAt) : startDate;

		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			continue;
		}

		let currentDate = new Date(startDate);
		while (currentDate <= endDate) {
			const dateKey = format(currentDate, 'yyyy-MM-dd');

			if (!scheduleEventByDay[dateKey]) {
				scheduleEventByDay[dateKey] = [];
			}

			scheduleEventByDay[dateKey].push(event);

			currentDate = addDays(currentDate, 1);
		}
	}

	$: filteredEvents = Object.fromEntries(
		Object.entries(scheduleEventByDay).filter(([date, events]) => {
			if (dateFilter && date !== dateFilter) {
				return false;
			}

			const filtered = events.filter(
				(event) =>
					(!locationFilter ||
						event.location?.name?.toLowerCase().includes(locationFilter.toLowerCase().trim())) &&
					(!nameFilter || event.title.toLowerCase().includes(nameFilter.toLowerCase().trim())) &&
					(!descriptionFilter ||
						event.shortDescription
							?.toLowerCase()
							.includes(descriptionFilter.toLowerCase().trim()) ||
						event.description?.toLowerCase().includes(descriptionFilter.toLowerCase().trim()))
			);

			return filtered.length > 0;
		})
	);
</script>

<div class="flex gap-4 mb-4">
	<input type="date" bind:value={dateFilter} class="form-input" />
	<input type="text" bind:value={locationFilter} placeholder="Search place..." class="form-input" />
	<input type="text" bind:value={nameFilter} placeholder="Search by name..." class="form-input" />
	<input
		type="text"
		bind:value={descriptionFilter}
		placeholder="Search short or long description..."
		class="form-input"
	/>
</div>

<div class="flex flex-col gap-4 {className}">
	{#if schedule.allowSubscription}
		<div class="flex flex-row">
			<a
				href="/schedule/{schedule._id}/subscribe"
				class="btn btn-gray no-underline text-xl text-center whitespace-nowrap p-2 mt-2"
			>
				🔔 {t('schedule.subscribeCTA')}
			</a>
		</div>
	{/if}
	{#each Object.entries(filteredEvents) as [date, events]}
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-bold">
				{upperFirst(
					new Date(date).toLocaleDateString($locale, {
						weekday: 'long',
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					})
				)}
			</h2>
			{#each events as event}
				<p class="flex flex-row text-sm gap-1">
					{#if event.unavailabity?.isUnavailable}
						<span class="font-bold">[{event.unavailabity.label}]&nbsp;</span>
					{/if}
					{event.title}
					{#if event.endsAt && isSameDay(event.endsAt, event.beginsAt)}
						{t('schedule.dateText', {
							beginTime: event.beginsAt.toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							}),
							endTime: event.endsAt.toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							})
						})}
					{:else if event.endsAt && !isSameDay(event.endsAt, event.beginsAt)}
						{t('schedule.differentDayText', {
							beginDate: event.beginsAt.toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							}),
							endDate: event.endsAt.toLocaleTimeString($locale, {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							})
						})}
					{:else}
						{t('schedule.uniqueDateText', {
							beginTime: event.beginsAt.toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							})
						})}
					{/if}
					{#if event.location?.name}
						- <a href={event.location.link} target="_blank" class="body-hyperlink underline">📍</a>
					{/if}
					{#if event.url}
						<a title={t('schedule.moreInfo')} href={event.url} target="_blank">ℹ️</a>
					{/if}
					<a title="Provide rss feed" href="/schedule/{schedule._id}/rss.xml" target="_blank">
						<IconRssFeed />
					</a>
					<IcsExport {event} pastEventDelay={schedule.pastEventDelay} />
					{#if event.rsvp?.target}
						<a href="/schedule/{schedule._id}/rsvp/{event.slug}" target="_blank" title="rsvp option"
							>🙋</a
						>
					{/if}
				</p>
			{/each}
		</div>
	{/each}
</div>
