<script lang="ts">
	import LeaderBoardWidget from '$lib/components/LeaderBoardWidget.svelte';

	export let data;
</script>

<main class="mx-auto max-w-7xl py-10 px-6">
	<article
		class="w-full rounded-xl body-secondPlan border-gray-300 border py-3 px-3 flex flex-col gap-2"
	>
		<h1 class="text-3xl">{data.leaderboard.name}</h1>
		<LeaderBoardWidget
			leaderboard={data.leaderboard}
			pictures={data.pictures}
			products={data.products}
		/>
	</article>
</main>
