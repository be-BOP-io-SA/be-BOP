<script lang="ts">
	import ThemeForm from '$lib/components/ThemeForm.svelte';

	export let data;
	function confirmDuplicate(event: Event) {
		if (!confirm('Be careful, this will overwrite your theme settings')) {
			event.preventDefault();
		}
	}
</script>

<h1 class="text-3xl">Edit theme</h1>

<form method="post" class="flex flex-col gap-4" action="?/update">
	<ThemeForm theme={data.theme} />
	<div class="flex flex-row gap-4">
		<input
			type="submit"
			class="btn btn-blue self-start text-white"
			value="Submit"
			formaction="?/update"
		/>
		<input
			type="submit"
			class="btn btn-gray self-start"
			value="Duplicate light to dark"
			formaction="?/duplicateToDark"
			on:click={confirmDuplicate}
		/>
		<input
			type="submit"
			class="btn btn-black self-start text-white"
			value="Duplicate dark to light"
			formaction="?/duplicateToLight"
			on:click={confirmDuplicate}
		/>
	</div>
</form>
