<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { EventSchedule, Schedule } from '$lib/types/Schedule';
	import PictureComponent from '../Picture.svelte';
	import { useI18n } from '$lib/i18n';
	import { upperFirst } from '$lib/utils/upperFirst';
	import { addMinutes } from 'date-fns';

	export let pictures: Picture[] | [];
	export let schedule: Schedule;
	let className = '';
	export { className as class };
	$: pictureByEventSlug = Object.fromEntries(
		pictures.map((picture) => [picture.schedule?.eventSlug, picture])
	);
	const { t, locale } = useI18n();

	function compareEvents(a: EventSchedule, b: EventSchedule, sortByDesc: boolean) {
		return sortByDesc
			? new Date(b.beginsAt).getTime() - new Date(a.beginsAt).getTime()
			: new Date(a.beginsAt).getTime() - new Date(b.beginsAt).getTime();
	}

	let now = new Date();

	let futureEvents: EventSchedule[] = [];
	let pastEvents: EventSchedule[] = [];

	schedule.events.forEach((eve) => {
		const endsAt = eve.endsAt
			? new Date(eve.endsAt)
			: addMinutes(new Date(eve.beginsAt), schedule.pastEventDelay);

		if (now <= endsAt) {
			futureEvents.push(eve);
		} else {
			pastEvents.push(eve);
		}
	});

	futureEvents.sort((a, b) => compareEvents(a, b, schedule.sortByEventDateDesc));
	pastEvents.sort((a, b) => compareEvents(a, b, schedule.sortByEventDateDesc));

	let updatedSchedule = {
		...schedule,
		events: schedule.displayPastEvents
			? schedule.displayPastEventsAfterFuture
				? [...futureEvents, ...pastEvents]
				: [...pastEvents, ...futureEvents]
			: [...futureEvents]
	};
</script>

{#each updatedSchedule.events as event, i}
	<div
		class="flex {i % 2 === 1
			? 'flex-row-reverse'
			: 'flex-row'} gap-4 tagWidget tagWidget-main w-full items-center {className}"
	>
		<div class="grow">
			<PictureComponent
				picture={pictureByEventSlug[event.slug]}
				class="max-h-[240x] max-w-[240px] ml-auto object-contain  {(event.endsAt &&
					event.endsAt < new Date()) ||
				addMinutes(new Date(event.beginsAt), schedule.pastEventDelay) < new Date()
					? 'opacity-50'
					: ''}"
			/>
		</div>
		<div class="p-4 grow-[2]">
			<h2 class="text-2xl font-bold body-title mb-2">
				{event.title}
			</h2>
			<p class="text-sm">
				{upperFirst(
					event.beginsAt.toLocaleDateString($locale, {
						weekday: 'long',
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					})
				)}
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
					- <a href={event.location.link} target="_blank" class="body-hyperlink"
						>{event.location.name}</a
					>
				{/if}
				{#if event.unavailabity?.isUnavailable}
					<span class="font-bold">[{event.unavailabity.label}]</span>
				{/if}
			</p>

			<p class="font-semibold text-xl mt-2">{event.shortDescription}</p>

			<p class="text-sm mt-2">
				{event.description}
			</p>
			{#if event.url}
				<div class="flex flex-row">
					<a
						href={event.url}
						target="_blank"
						class="btn cartPreview-secondaryCTA text-xl text-center whitespace-nowrap p-1 mt-2"
					>
						{t('schedule.moreInfo')}
					</a>
				</div>
			{/if}
		</div>
	</div>
{/each}
