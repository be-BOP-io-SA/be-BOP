<script lang="ts">
	let uploading = false;
</script>

<h1 class="text-3xl">Add a default picture for schedule event</h1>

<form method="post" class="flex flex-col gap-4" enctype="multipart/form-data">
	Current picture
	<!-- svelte-ignore a11y-img-redundant-alt -->
	<img src="/asset/event-default-picture.png" alt="default-event-picture" class="w-24 h-24" />

	<label>
		File
		<input
			type="file"
			class="block"
			required
			name="file"
			accept="image/jpeg,image/png,image/webp"
		/>
	</label>

	<input type="submit" class="btn btn-gray self-start" value="Add" disabled={uploading} />
</form>
