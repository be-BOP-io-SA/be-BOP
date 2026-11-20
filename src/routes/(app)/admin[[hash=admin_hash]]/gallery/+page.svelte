<script lang="ts">
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="{data.adminPrefix}/gallery/new" class="underline block">{t('admin.gallery.addGallery')}</a>

<h1 class="text-3xl">{t('admin.gallery.listOfGallery')}</h1>

<ul>
	{#each data.galleries as gallery}
		<li>
			{gallery._id} -
			<a href="{data.adminPrefix}/gallery/{gallery._id}" class="underline body-hyperlink"
				>{gallery.name}</a
			>
		</li>
	{:else}
		{t('admin.gallery.noGalleryYet')}
	{/each}
</ul>
