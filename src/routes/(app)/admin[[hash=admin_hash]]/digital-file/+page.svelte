<script lang="ts">
	export let data;
</script>

<h1 class="text-3xl">List of file with no associated product</h1>

<a href="{data.adminPrefix}/digital-file/new" class="block underline">New file</a>

<div class="flex flex-row flex-wrap gap-6">
	{#each data.files as file}
		<div class="flex flex-col text-center">
			<a
				href="{data.adminPrefix}/digital-file/{file._id}"
				class="flex flex-col items-center underline"
			>
				<h2 class="text-xl">{file.name}</h2>
			</a>
		</div>
	{/each}
</div>
