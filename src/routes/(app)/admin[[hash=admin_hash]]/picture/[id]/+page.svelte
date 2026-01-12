<script lang="ts">
	import Picture from '$lib/components/Picture.svelte';

	export let data;
	let darkPicture = 'light';
</script>

<form method="post" action="?/update" class="flex flex-col gap-4">
	{#if data.picture.productId}
		<a
			href="{data.adminPrefix}/product/{data.picture.productId}"
			class="underline body-hyperlink text-center">Back to product</a
		>
	{:else}
		<a href="{data.adminPrefix}/picture" class="underline body-hyperlink text-center">
			Back to list
		</a>
	{/if}

	<label class="form-label">
		Slug
		<input type="text" disabled class="form-input" value={data.picture._id} />
	</label>

	<label class="form-label">
		Name
		<input type="text" name="name" class="form-input" value={data.picture.name} />
	</label>

	<Picture picture={data.picture} class="object-contain max-h-[500px] max-w-full" />
	<div class="flex flex-wrap gap-4">
		<input type="submit" value="Update" class="btn btn-black" />
		<input type="hidden" name="darkPicture" bind:value={darkPicture} />
		<label class="checkbox-label">
			<input type="checkbox" name="isWide" class="form-checkbox" checked={data.logo.isWide} />
			Image will be a wide logo
		</label>
		{#if !data.picture.productId}
			{#if data.logo.pictureId === data.picture._id}
				<input
					type="submit"
					value="Remove from logo"
					formaction="?/removeLogo"
					class="btn body-mainCTA"
				/>
			{:else}
				<input
					type="submit"
					value="Set as logo"
					formaction="?/setAsLogo"
					class="btn body-mainCTA"
				/>
			{/if}
			{#if data.logo.darkModePictureId === data.picture._id}
				<input
					type="submit"
					value="Remove from dark logo"
					formaction="?/removeLogo"
					class="btn body-mainCTA"
					on:click={() => (darkPicture = 'dark')}
				/>
			{:else}
				<input
					type="submit"
					value="Set as dark logo"
					formaction="?/setAsLogo"
					class="btn body-mainCTA"
					on:click={() => (darkPicture = 'dark')}
				/>
			{/if}
			{#if data.footerLogoId === data.picture._id}
				<input
					type="submit"
					value="Remove from footer logo"
					formaction="?/removeFooterLogo"
					class="btn body-mainCTA"
				/>
			{:else}
				<input
					type="submit"
					value="Set as footer logo"
					formaction="?/setAsFooterLogo"
					class="btn body-mainCTA"
				/>
			{/if}
			{#if data.faviconPictureId === data.picture._id}
				<input
					type="submit"
					value="Remove from favicon"
					formaction="?/removeFavicon"
					class="btn body-mainCTA"
				/>
			{:else}
				<input
					type="submit"
					value="Set as favicon"
					formaction="?/setAsFavicon"
					class="btn body-mainCTA"
				/>
			{/if}
			{#if data.ticketLogoId === data.picture._id}
				<input
					type="submit"
					value="Remove from ticket logo"
					formaction="?/removeTicketLogo"
					class="btn body-mainCTA"
				/>
			{:else}
				<input
					type="submit"
					value="Set as ticket logo"
					formaction="?/setAsTicketLogo"
					class="btn body-mainCTA"
				/>
			{/if}
		{/if}
		<input type="submit" value="Delete" formaction="?/delete" class="btn btn-red ml-auto" />
	</div>
</form>
