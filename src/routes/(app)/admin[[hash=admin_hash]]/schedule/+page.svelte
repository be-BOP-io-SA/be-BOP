<script lang="ts">
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';

	export let data;
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="{data.adminPrefix}/schedule/new" class="underline block">Add schedule</a>
<a href="{data.adminPrefix}/schedule/event-default-picture" class="underline block"
	>Event default picture</a
>

<h1 class="text-3xl">List of Schedules</h1>

<ul>
	{#each data.schedules as schedule}
		<li>
			{schedule._id} -
			<a href="{data.adminPrefix}/schedule/{schedule._id}" class="underline body-hyperlink"
				>{schedule.name}</a
			>
		</li>
	{:else}
		No schedule yet
	{/each}
</ul>
