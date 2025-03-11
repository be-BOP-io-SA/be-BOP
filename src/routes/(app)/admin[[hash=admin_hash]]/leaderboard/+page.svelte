<script lang="ts">
	export let data;
</script>

<a href="{data.adminPrefix}/leaderboard/new" class="underline block">Add leaderboard</a>

<h1 class="text-3xl">List of leaderboards</h1>
<ul>
	{#each data.leaderboards as leaderboard}
		<li>
			<a href="{data.adminPrefix}/leaderboard/{leaderboard._id}" class="underline text-blue">
				{leaderboard.name}
			</a>
			-
			<span class="text-gray-550">[Leaderboard={leaderboard._id}]</span>
		</li>
	{:else}
		No leaderboards yet
	{/each}
</ul>
