<script lang="ts">
	import Picture from '$lib/components/Picture.svelte';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;
	let darkPicture = 'light';

	const { t } = useI18n();
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<form method="post" action="?/update" class="flex flex-col gap-4">
	{#if data.picture.productId}
		<a
			href="{data.adminPrefix}/product/{data.picture.productId}"
			class="underline body-hyperlink text-center">{t('admin.picture.backToProduct')}</a
		>
	{:else}
		<a href="{data.adminPrefix}/picture" class="underline body-hyperlink text-center">
			{t('admin.picture.backToList')}
		</a>
	{/if}

	<label class="form-label">
		{t('admin.picture.slug')}
		<input type="text" disabled class="form-input" value={data.picture._id} />
	</label>

	<label class="form-label">
		{t('admin.picture.name')}
		<input type="text" name="name" class="form-input" value={data.picture.name} />
	</label>

	<Picture picture={data.picture} class="object-contain max-h-[500px] max-w-full" />
	<div class="flex flex-wrap gap-4">
		<input type="submit" value="Update" class="btn btn-black" />
		<input type="hidden" name="darkPicture" bind:value={darkPicture} />
		<label class="checkbox-label">
			<input type="checkbox" name="isWide" class="form-checkbox" checked={data.logo.isWide} />
			{t('admin.picture.wideLogoLabel')}
		</label>
		{#if !data.picture.productId}
			{#if data.logo.pictureId === data.picture._id}
				<input
					type="submit"
					value={t('admin.picture.removeFromLogo')}
					formaction="?/removeLogo"
					class="btn body-mainCTA"
				/>
			{:else}
				<input
					type="submit"
					value={t('admin.picture.setAsLogo')}
					formaction="?/setAsLogo"
					class="btn body-mainCTA"
				/>
			{/if}
			{#if data.logo.darkModePictureId === data.picture._id}
				<input
					type="submit"
					value={t('admin.picture.removeFromDarkLogo')}
					formaction="?/removeLogo"
					class="btn body-mainCTA"
					on:click={() => (darkPicture = 'dark')}
				/>
			{:else}
				<input
					type="submit"
					value={t('admin.picture.setAsDarkLogo')}
					formaction="?/setAsLogo"
					class="btn body-mainCTA"
					on:click={() => (darkPicture = 'dark')}
				/>
			{/if}
			{#if data.footerLogoId === data.picture._id}
				<input
					type="submit"
					value={t('admin.picture.removeFromFooterLogo')}
					formaction="?/removeFooterLogo"
					class="btn body-mainCTA"
				/>
			{:else}
				<input
					type="submit"
					value={t('admin.picture.setAsFooterLogo')}
					formaction="?/setAsFooterLogo"
					class="btn body-mainCTA"
				/>
			{/if}
			{#if data.faviconPictureId === data.picture._id}
				<input
					type="submit"
					value={t('admin.picture.removeFromFavicon')}
					formaction="?/removeFavicon"
					class="btn body-mainCTA"
				/>
			{:else}
				<input
					type="submit"
					value={t('admin.picture.setAsFavicon')}
					formaction="?/setAsFavicon"
					class="btn body-mainCTA"
				/>
			{/if}
			{#if data.ticketLogoId === data.picture._id}
				<input
					type="submit"
					value={t('admin.picture.removeFromTicketLogo')}
					formaction="?/removeTicketLogo"
					class="btn body-mainCTA"
				/>
			{:else}
				<input
					type="submit"
					value={t('admin.picture.setAsTicketLogo')}
					formaction="?/setAsTicketLogo"
					class="btn body-mainCTA"
				/>
			{/if}
		{/if}
		<input
			type="submit"
			value={t('admin.picture.delete')}
			formaction="?/delete"
			class="btn btn-red ml-auto"
		/>
	</div>
</form>
