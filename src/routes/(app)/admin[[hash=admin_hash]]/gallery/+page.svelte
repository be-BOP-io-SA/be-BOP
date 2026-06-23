<script lang="ts">
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';

	export let data;
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="{data.adminPrefix}/gallery/new" class="underline block">Add gallery</a>

<h1 class="text-3xl">List of Gallery</h1>

<ul>
	{#each data.galleries as gallery}
		<li>
			{gallery._id} -
			<a href="{data.adminPrefix}/gallery/{gallery._id}" class="underline body-hyperlink"
				>{gallery.name}</a
			>
		</li>
	{:else}
		No gallery yet
	{/each}
</ul>
