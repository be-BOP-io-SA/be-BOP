<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { EventSchedule, Schedule } from '$lib/types/Schedule';
	import { typedInclude } from '$lib/utils/typedIncludes';
	import { typedKeys } from '$lib/utils/typedKeys';
	import { addMinutes } from 'date-fns';
	import ScheduleWidgetMain from './ScheduleWidget/ScheduleWidgetMain.svelte';
	import ScheduleWidgetMainLight from './ScheduleWidget/ScheduleWidgetMainLight.svelte';
	import ScheduleWidgetList from './ScheduleWidget/ScheduleWidgetList.svelte';
	import ScheduleWidgetMobile from './ScheduleWidget/ScheduleWidgetMobile.svelte';
	import ScheduleWidgetCalendar from './ScheduleWidget/ScheduleWidgetCalendar.svelte';

	export let pictures: Picture[] | [];
	export let schedule: Schedule;
	let className = '';
	export { className as class };
	export let displayOption = 'main';
	const widgets = {
		main: {
			component: ScheduleWidgetMain
		},
		'main-light': {
			component: ScheduleWidgetMainLight
		},
		list: {
			component: ScheduleWidgetList
		},
		calendar: {
			component: ScheduleWidgetCalendar
		}
	};

	$: widget = typedInclude(typedKeys(widgets), displayOption)
		? widgets[displayOption]
		: widgets['main'];

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

{#if displayOption !== 'calendar'}
	<div class="hidden lg:contents">
		<svelte:component
			this={widget.component}
			schedule={updatedSchedule}
			{pictures}
			class={className}
		/>
	</div>
	<div class="lg:hidden contents">
		<svelte:component this={ScheduleWidgetMobile} {schedule} {pictures} class={className} />
	</div>
{:else}
	<svelte:component
		this={widget.component}
		schedule={updatedSchedule}
		{pictures}
		class={className}
	/>
{/if}
