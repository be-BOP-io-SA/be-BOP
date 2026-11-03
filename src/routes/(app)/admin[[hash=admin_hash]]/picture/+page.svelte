<script lang="ts">
	import Picture from '$lib/components/Picture.svelte';
	import S3NotConfiguredWarning from '$lib/components/S3NotConfiguredWarning.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.picture.listTitle')}</h1>

{#if !data.s3IsConfigured}
	<S3NotConfiguredWarning adminPrefix={data.adminPrefix} />
{/if}

<a href="{data.adminPrefix}/picture/new" class="block underline">{t('admin.picture.newPicture')}</a>
<a href="{data.adminPrefix}/picture/name" class="block underline"
	>{t('admin.picture.bulkNameEditor')}</a
>

<div class="flex flex-row flex-wrap gap-6">
	{#each data.pictures as picture}
		<div class="flex flex-col text-center">
			<a href="{data.adminPrefix}/picture/{picture._id}" class="flex flex-col items-center">
				<Picture {picture} class="block h-36" />
				<span>{picture.name}</span>
			</a>
		</div>
	{/each}
</div>
