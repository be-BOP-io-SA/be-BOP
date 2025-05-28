<script lang="ts">
	export let data;
</script>

<a href="{data.adminPrefix}/gallery/new" class="underline block">Add gallery</a>

<h1 class="text-3xl">List of Gallery</h1>

<ul>
	{#each data.galleries as gallery}
		<li>
			{gallery._id} -
			<a href="{data.adminPrefix}/gallery/{gallery._id}" class="underline">{gallery.name}</a>
		</li>
	{:else}
		No gallery yet
	{/each}
</ul>
