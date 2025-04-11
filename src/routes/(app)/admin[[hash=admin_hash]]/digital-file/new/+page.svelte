<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	const productId = $page.url.searchParams.get('productId');
	export let data;

	let files: FileList | null = null;
	let name = '';

	let uploading = false;
	async function handleSubmit() {
		if (!files || files.length === 0) {
			alert('Please select a file');
			return;
		}
		try {
			uploading = true;
			const fileSize = files[0].size;
			const fileName = files[0].name;

			const response = await fetch(`${data.adminPrefix}/digital-file/prepare`, {
				method: 'POST',
				body: JSON.stringify({
					name,
					fileName,
					fileSize,
					productId
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(await response.text());
			}

			const { uploadUrl, digitalFileId } = await response.json();

			const uploadResponse = await fetch(uploadUrl, {
				method: 'PUT',
				body: files[0]
			});

			if (!uploadResponse.ok) {
				throw new Error(await uploadResponse.text());
			}

			const finalizeResponse = await fetch(`${data.adminPrefix}/digital-file/finalize`, {
				method: 'POST',
				body: JSON.stringify({
					digitalFileId
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!finalizeResponse.ok) {
				throw new Error(await finalizeResponse.text());
			}

			await goto(`${data.adminPrefix}/digital-file/${digitalFileId}`);
		} catch (error) {
			alert(error);
		} finally {
			uploading = false;
		}
	}
</script>

<h1 class="text-3xl">Add a digital file</h1>

<form method="post" class="flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
	<label>
		Name of the file
		<input
			class="form-input block"
			type="text"
			name="name"
			placeholder="Final name"
			bind:value={name}
			required
		/>
	</label>

	<label>
		File
		<input type="file" class="block" bind:files required />
	</label>

	{#if productId}
		<p>
			Associated product: <a href="{data.adminPrefix}/product/{productId}" class="hover:underline"
				>{productId}
			</a>
		</p>
	{/if}

	{#if !uploading}
		<input type="submit" class="btn btn-gray self-start" value="Add" />
	{:else}
		<p>Uploading...</p>
	{/if}
</form>
