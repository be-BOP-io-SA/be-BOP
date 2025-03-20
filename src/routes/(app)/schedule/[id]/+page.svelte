<script>
	import ScheduleWidget from '$lib/components/ScheduleWidget.svelte';

	export let data;
</script>

<div class="mx-4 my-4">
	<ScheduleWidget pictures={data.pictures} schedule={data.schedule} />
</div>
