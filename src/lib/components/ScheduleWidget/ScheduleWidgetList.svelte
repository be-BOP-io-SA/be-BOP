<script lang="ts">
	import type { EventSchedule, Schedule } from '$lib/types/Schedule';
	import { useI18n } from '$lib/i18n';
	import { upperFirst } from '$lib/utils/upperFirst';

	export let schedule: Schedule;
	let className = '';
	export { className as class };

	const { t, locale } = useI18n();
	let scheduleEventByDay: Record<string, EventSchedule[]> = schedule.events.reduce(
		(acc, event) => {
			let dateKey = new Date(event.beginsAt).toISOString().split('T')[0];

			if (!acc[dateKey]) {
				acc[dateKey] = [];
			}

			acc[dateKey].push(event);

			return acc;
		},
		{} as Record<string, typeof schedule.events>
	);
</script>

<div class="flex flex-col gap-4 {className}">
	{#each Object.entries(scheduleEventByDay) as [date, events]}
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
				<p class="flex flex-row text-sm">
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
	{/each}
</div>
