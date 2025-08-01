<script lang="ts">
	import { onMount } from 'svelte';
	import {
		format,
		startOfMonth,
		endOfMonth,
		startOfWeek,
		endOfWeek,
		addDays,
		subMonths,
		addMonths,
		isSameDay,
		addMinutes
	} from 'date-fns';
	import type { ScheduleEvent, Schedule } from '$lib/types/Schedule';
	import { useI18n } from '$lib/i18n';
	import { upperFirst } from '$lib/utils/upperFirst';
	import IconRssFeed from '../icons/IconRssFeed.svelte';
	import IcsExport from './IcsExport.svelte';
	import { getScheduleTimezone, offsetFromUTC } from '$lib/utils/scheduleTimezone';

	export let schedule: Pick<
		Schedule,
		'allowSubscription' | 'events' | 'pastEventDelay' | '_id' | 'timezone'
	>;
	let className = '';
	export let isDayDisabled: (date: Date) => boolean = () => false;
	export let selectedDate = new Date();
	export { className as class };

	const { t, locale } = useI18n();

	let currentDate = new Date();
	let days: Date[] = [];
	let weekDays: string[] = [];

	let scheduleEventByDay: Record<string, ScheduleEvent[]> = {};
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

	function generateWeekDays() {
		const start = startOfWeek(new Date(), { weekStartsOn: 1 });
		weekDays = Array.from({ length: 7 }, (_, i) =>
			addDays(start, i).toLocaleDateString($locale, { weekday: 'short' }).substring(0, 2)
		);
	}

	function generateCalendar() {
		const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
		const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

		days = Array.from({ length: (end.getTime() - start.getTime()) / 86400000 + 1 }, (_, i) =>
			addDays(start, i)
		);
	}

	function prevMonth() {
		currentDate = subMonths(currentDate, 1);
		generateCalendar();
	}

	function nextMonth() {
		currentDate = addMonths(currentDate, 1);
		generateCalendar();
	}

	function isEventDay(date: Date) {
		return scheduleEventByDay[format(date, 'yyyy-MM-dd')];
	}
	function hasCustomColorEvents(date: Date) {
		const key = format(date, 'yyyy-MM-dd');
		const events = scheduleEventByDay[key] ?? [];
		const specialEvent = events.filter((event) => event.calendarColor);
		return specialEvent;
	}

	function selectDate(date: Date) {
		selectedDate = new Date(date);
	}

	onMount(() => {
		generateCalendar();
		generateWeekDays();
	});
</script>

{#if schedule.allowSubscription}
	<div class="max-w-md mx-auto flex flex-row {className}">
		<a
			href="/schedule/{schedule._id}/subscribe"
			class="btn body-mainCTA no-underline text-xl text-center whitespace-nowrap p-2 mt-2"
		>
			🔔 {t('schedule.subscribeCTA')}
		</a>
	</div>
{/if}
<div class="max-w-md mx-auto p-4 eventCalendar eventCalendar-main shadow-md rounded-lg {className}">
	<div class="flex items-center justify-between mb-4">
		<button on:click={prevMonth} type="button" class="py-2 eventCalendar-navCTA btn rounded-full"
			>&lt;</button
		>
		<h2 class="text-lg font-semibold">
			{new Date(currentDate).toLocaleDateString($locale, {
				month: 'long',
				year: 'numeric'
			})}
		</h2>
		<button type="button" on:click={nextMonth} class="py-2 eventCalendar-navCTA btn rounded-full"
			>&gt;</button
		>
	</div>

	<div class="grid grid-cols-7 text-center font-semibold">
		{#each weekDays as day}
			<span>{day}</span>
		{/each}
	</div>

	<div class="grid grid-cols-7 text-center mt-1">
		{#each days as day}
			<button
				type="button"
				on:click={() => selectDate(day)}
				class="p-2 m-1 rounded-full
					{isSameDay(day, new Date()) ? 'eventCalendar-currentDate font-bold' : ''}
					{isEventDay(day) ? 'eventCalendar-hasEvent font-bold' : ''}
					{selectedDate && isSameDay(day, selectedDate) ? ' ring-2 ring-black' : ''}
					{format(day, 'M') !== format(currentDate, 'M') || isDayDisabled(day) ? ' text-gray-400' : ''}"
				style="background-color:{!!hasCustomColorEvents(day) &&
				hasCustomColorEvents(day).length === 1
					? hasCustomColorEvents(day)[0].calendarColor
					: ''}"
			>
				{format(day, 'd')}
			</button>
		{/each}
	</div>
</div>

<div class="max-w-7xl mx-auto {className}">
	{#if selectedDate && scheduleEventByDay[format(selectedDate, 'yyyy-MM-dd')]}
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-bold">
				{upperFirst(
					new Date(selectedDate).toLocaleDateString($locale, {
						weekday: 'long',
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					})
				)}
			</h2>
			{#each scheduleEventByDay[format(selectedDate, 'yyyy-MM-dd')] as event}
				<p class="flex flex-row text-sm gap-1">
					{#if event.unavailabity?.isUnavailable}
						<span class="font-bold">[{event.unavailabity.label}]&nbsp;</span>
					{/if}
					{event.title}
					{#if event.endsAt && isSameDay(event.endsAt, event.beginsAt)}
						{t('schedule.dateText', {
							beginTime: addMinutes(
								event.beginsAt,
								offsetFromUTC(getScheduleTimezone(schedule))
							).toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							}),
							endTime: addMinutes(
								event.endsAt,
								offsetFromUTC(getScheduleTimezone(schedule))
							).toLocaleTimeString($locale, {
								hour: '2-digit',
								minute: '2-digit'
							})
						})}
					{:else if event.endsAt && !isSameDay(event.endsAt, event.beginsAt)}
						{t('schedule.differentDayText', {
							beginDate: addMinutes(
								event.beginsAt,
								offsetFromUTC(getScheduleTimezone(schedule))
							).toLocaleTimeString($locale, {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
								year: 'numeric',
								hour: '2-digit',
								minute: '2-digit'
							}),
							endDate: addMinutes(
								event.endsAt,
								offsetFromUTC(getScheduleTimezone(schedule))
							).toLocaleTimeString($locale, {
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
							beginTime: addMinutes(
								event.beginsAt,
								offsetFromUTC(getScheduleTimezone(schedule))
							).toLocaleTimeString($locale, {
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
					{#if event.rsvp?.target && event.endsAt && event.endsAt > new Date()}
						<a href="/schedule/{schedule._id}/rsvp/{event.slug}" target="_blank" title="rsvp option"
							>🙋</a
						>
					{/if}
				</p>
			{/each}
		</div>
	{/if}
</div>
