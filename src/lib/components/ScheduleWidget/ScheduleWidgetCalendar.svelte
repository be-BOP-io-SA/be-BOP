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

	export let schedule: Schedule;
	let className = '';
	export { className as class };

	const { t, locale } = useI18n();

	let currentDate = new Date();
	let selectedDate: Date | null = null;
	let days: Date[] = [];
	let weekDays: string[] = [];

	let scheduleEventByDay: Record<string, EventSchedule[]> = schedule.events.reduce(
		(acc, event) => {
			const dateKey = event.beginsAt.toISOString().split('T')[0];
			(acc[dateKey] ||= []).push(event);
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

	function selectDate(date: Date) {
		selectedDate = date;
	}

	onMount(() => {
		generateCalendar();
		generateWeekDays();
	});
</script>

<div class="max-w-md mx-auto p-4 bg-white shadow-md rounded-lg {className}">
	<div class="flex items-center justify-between mb-4">
		<button on:click={prevMonth} class="p-2 btn-gray btn rounded-full">&lt;</button>
		<h2 class="text-lg font-semibold">
			{new Date(currentDate).toLocaleDateString($locale, {
				month: 'long',
				year: 'numeric'
			})}
		</h2>
		<button on:click={nextMonth} class="p-2 btn-gray btn rounded-full">&gt;</button>
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
				class="p-2 m-1 rounded-full
					{isSameDay(day, new Date()) ? ' bg-blue-500 text-white font-bold' : ''}
					{isEventDay(day) ? 'bg-roseofsharon-500 text-white font-bold' : ''}
					{selectedDate && isSameDay(day, selectedDate) ? ' ring-2 ring-black' : ''}
					{format(day, 'M') !== format(currentDate, 'M') ? ' text-gray-400' : ''}"
			>
				{format(day, 'd')}
			</button>
		{/each}
	</div>
</div>
<div class="max-w-7xl mx-auto {className}">
	{#if selectedDate && scheduleEventByDay[selectedDate.toISOString().split('T')[0]]}
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
			{#each scheduleEventByDay[selectedDate.toISOString().split('T')[0]] as event}
				<p class="flex flex-row text-sm gap-2">
					{#if event.unavailabity?.isUnavailable}
						<span class="font-bold">[{event.unavailabity.label}]&nbsp;</span>
					{/if}
					{event.title}
					{#if event.endsAt}
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
				</p>
			{/each}
		</div>
	{/if}
</div>
