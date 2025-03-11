<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;

	let errorMessage = '';
	let loading = false;
</script>

<h1 class="text-3xl">Bulk Alias Change</h1>

<form
	class="flex flex-col gap-2"
	method="post"
	use:enhance={() => {
		errorMessage = '';
		return async ({ result }) => {
			loading = false;

			if (result.type === 'error') {
				errorMessage = result.error.message;
				return;
			}
		};
	}}
	on:submit|preventDefault={() => (loading = true)}
>
	{#each data.products as product}
		<h2 class="text-2xl">{product.name}</h2>
		<div class="gap-4 flex flex-col md:flex-row">
			<label class="w-full">
				Current slug
				<input class="form-input" type="text" placeholder="slug" value={product._id} disabled />
			</label>

			<label class="w-full">
				Alias
				<input
					class="form-input"
					type="text"
					name="{product._id}.alias"
					placeholder="alias"
					value={product.alias?.[1] ?? ''}
				/>
			</label>
		</div>
	{/each}
	{#if errorMessage}
		<span class="text-red-500">{errorMessage}</span>
	{/if}
	<button class="btn btn-black self-start mt-4" type="submit" disabled={loading}>Update</button>
</form>
