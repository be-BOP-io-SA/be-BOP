<script lang="ts">
	export let data;
</script>

<a href="{data.adminPrefix}/searchlist/new" class="underline block">Add searchlist</a>

<h1 class="text-3xl">List of searchlists</h1>
<ul>
	{#each data.searchlists as searchlist}
		<li>
			<a href="{data.adminPrefix}/searchlist/{searchlist._id}" class="underline text-blue">
				{searchlist.name}
			</a>
			{#if searchlist.disabled}
				<span class="text-xs bg-gray-500 text-white px-2 py-0.5 rounded ml-1">Disabled</span>
			{/if}
			-
			<span class="text-gray-550">[Searchlist={searchlist._id}]</span>
		</li>
	{:else}
		No searchlists yet
	{/each}
</ul>
