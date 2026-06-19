<script lang="ts">
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';

	export let data;
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="/admin/slider/new" class="underline block">Add slider</a>

<h1 class="text-3xl">List of sliders</h1>

<div class="flex flex-row flex-wrap gap-6">
	<ul>
		{#each data.sliders as slider}
			<li>
				{slider._id} -
				<a href="/admin/slider/{slider._id}" class="underline body-hyperlink">{slider.title}</a>
			</li>
		{:else}
			No slider yet
		{/each}
	</ul>
</div>
