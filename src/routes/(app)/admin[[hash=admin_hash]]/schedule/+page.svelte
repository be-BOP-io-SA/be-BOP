<script lang="ts">
	export let data;
</script>

<a href="{data.adminPrefix}/schedule/new" class="underline block">Add schedule</a>

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
