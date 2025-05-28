<script lang="ts">
	export let data;
</script>

<a href="{data.adminPrefix}/specification/new" class="underline block">Add specification</a>

<h1 class="text-3xl">List of Specification</h1>

<ul>
	{#each data.specifications as specification}
		<li>
			{specification._id} -
			<a href="{data.adminPrefix}/specification/{specification._id}" class="underline"
				>{specification.title}</a
			>
		</li>
	{:else}
		No specification yet
	{/each}
</ul>
