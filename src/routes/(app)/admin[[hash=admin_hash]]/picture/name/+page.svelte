<script lang="ts">
	export let data;
</script>

<h1 class="text-3xl">Bulk Picture Name Change</h1>

<form class="flex flex-col gap-2" method="post">
	{#each data.pictures as picture}
		<h2 class="text-2xl">{picture.name}</h2>
		<div class="gap-4 mx-4 flex flex-col md:flex-row">
			<label class="w-full">
				Current slug
				<input class="form-input" type="text" placeholder="slug" value={picture._id} disabled />
			</label>

			<label class="w-full">
				Name
				<input
					class="form-input"
					type="text"
					name="{picture._id}.name"
					placeholder="name"
					value={picture.name ?? ''}
				/>
			</label>
		</div>
	{/each}
	<button class="btn btn-black self-start mt-4" type="submit">Update</button>
</form>
