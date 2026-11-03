<script>
	import ScheduleWidget from '$lib/components/ScheduleWidget.svelte';
	import CmsTagSnippet from '$lib/components/CmsTagSnippet.svelte';

	export let data;
</script>

<div class="mx-4 my-4 flex flex-col gap-1">
	{#each ['main', 'main-light', 'list', 'calendar'] as display}
		<CmsTagSnippet tag="[Schedule={data.schedule._id}?display={display}]" />
	{/each}
</div>
<div class="mx-4 my-4">
	<ScheduleWidget pictures={data.pictures} schedule={data.schedule} />
</div>
