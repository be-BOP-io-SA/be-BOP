<script lang="ts">
	export let data;
</script>

<h1 class="text-3xl">Bulk CMS SEO Edit</h1>

<form class="flex flex-col gap-2" method="post">
	{#each data.cmsPages as cmsPage}
		<h2 class="text-2xl">{cmsPage._id}</h2>
		<div class="gap-2 mx-4">
			<label class="w-full form-label">
				Page Title
				<input
					class="form-input"
					type="text"
					name="{cmsPage._id}.title"
					placeholder="title"
					value={cmsPage.title}
				/>
			</label>

			<label class="w-full form-label">
				Short description
				<textarea
					class="form-input"
					cols="30"
					rows="5"
					name="{cmsPage._id}.shortDescription"
					placeholder="short description"
					value={cmsPage.shortDescription ?? ''}
				/>
			</label>
		</div>
	{/each}

	<button class="btn btn-black self-start mt-4" type="submit">Update</button>
</form>
