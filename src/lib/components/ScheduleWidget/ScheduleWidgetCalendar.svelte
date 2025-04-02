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
		isSameDay
	} from 'date-fns';
	import type { EventSchedule, Schedule } from '$lib/types/Schedule';
	import { useI18n } from '$lib/i18n';
	import { upperFirst } from '$lib/utils/upperFirst';
	import IconRssFeed from '../icons/IconRssFeed.svelte';
	import IcsExport from './IcsExport.svelte';

	export let schedule: Schedule;
	let className = '';
	export { className as class };

	const { t, locale } = useI18n();

	let currentDate = new Date();
	$: selectedDate = new Date();
	let days: Date[] = [];
	let weekDays: string[] = [];

	let scheduleEventByDay: Record<string, EventSchedule[]> = schedule.events.reduce(
		(acc, event) => {
			const startDate = new Date(event.beginsAt);
			const endDate = event.endsAt ? new Date(event.endsAt) : startDate;

			if (isNaN(startDate.getTime())) {
				return acc;
			}
			if (isNaN(endDate.getTime())) {
				return acc;
			}

			let currentDate = new Date(startDate);
			while (currentDate <= endDate) {
				const dateKey = format(currentDate, 'yyyy-MM-dd');

				if (!acc[dateKey]) {
					acc[dateKey] = [];
				}

				acc[dateKey].push(event);

				currentDate = addDays(currentDate, 1);
			}

			return acc;
		},
		{} as Record<string, EventSchedule[]>
	);

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
			class="btn btn-gray no-underline text-xl text-center whitespace-nowrap p-2 mt-2"
		>
			🔔 {t('schedule.subscribeCTA')}
		</a>
	</div>
{/if}
<div class="max-w-md mx-auto p-4 eventCalendar eventCalendar-main shadow-md rounded-lg {className}">
	<div class="flex items-center justify-between mb-4">
		<button on:click={prevMonth} class="py-2 eventCalendar-navCTA btn rounded-full">&lt;</button>
		<h2 class="text-lg font-semibold">
			{new Date(currentDate).toLocaleDateString($locale, {
				month: 'long',
				year: 'numeric'
			})}
		</h2>
		<button on:click={nextMonth} class="py-2 eventCalendar-navCTA btn rounded-full">&gt;</button>
	</div>

	<div class="grid grid-cols-7 text-center font-semibold">
		{#each weekDays as day}
			<span>{day}</span>
		{/each}
	</div>

	<div class="grid grid-cols-7 text-center mt-2">
		{#each days as day}
			<button
				on:click={() => selectDate(day)}
				class="p-2 m-2 rounded-full
					{isSameDay(day, new Date()) ? 'eventCalendar-currentDate font-bold' : ''}
					{isEventDay(day) ? 'eventCalendar-hasEvent font-bold' : ''}
					{selectedDate && isSameDay(day, selectedDate) ? ' ring-2 ring-black' : ''}
					{format(day, 'M') !== format(currentDate, 'M') ? ' text-gray-400' : ''}"
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
								weekday: 'long',
								day: 'numeric',
								month: 'long',
								year: 'numeric',
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
				</p>
			{/each}
		</div>
	{/if}
</div>
