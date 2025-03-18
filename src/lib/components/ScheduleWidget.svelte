<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { Schedule } from '$lib/types/Schedule';
	import { typedInclude } from '$lib/utils/typedIncludes';
	import { typedKeys } from '$lib/utils/typedKeys';
	import ScheduleWidgetMain from './ScheduleWidget/ScheduleWidgetMain.svelte';

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
			component: ScheduleWidgetMain
		}
	};

	$: widget = typedInclude(typedKeys(widgets), displayOption)
		? widgets[displayOption]
		: widgets['main'];
</script>

<svelte:component this={widget.component} {schedule} {pictures} class={className} />
