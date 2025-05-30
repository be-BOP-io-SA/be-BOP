<script lang="ts">
	import DEFAULT_EVENT_PICTURE from '$lib/assets/event-default-picture.svg';

	let uploading = false;
</script>

<h1 class="text-3xl">Add a default picture for schedule event</h1>

<form method="post" class="flex flex-col gap-4" enctype="multipart/form-data">
	Current picture
	<!-- svelte-ignore a11y-img-redundant-alt -->
	<img srcset={DEFAULT_EVENT_PICTURE} alt="default-event-picture" class="w-24 h-24" />

	<label>
		File
		<input type="file" class="block" required name="file" accept=".svg,image/svg+xml" />
	</label>

	<input type="submit" class="btn btn-gray self-start" value="Add" disabled={uploading} />
</form>
