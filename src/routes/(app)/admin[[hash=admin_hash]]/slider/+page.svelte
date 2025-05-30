<script lang="ts">
	export let data;
</script>

<a href="/admin/slider/new" class="underline block">Add slider</a>

<h1 class="text-3xl">List of sliders</h1>

<div class="flex flex-row flex-wrap gap-6">
	<ul>
		{#each data.sliders as slider}
			<li>
				{slider._id} -
				<a href="/admin/slider/{slider._id}" class="underline">{slider.title}</a>
			</li>
		{:else}
			No slider yet
		{/each}
	</ul>
</div>
