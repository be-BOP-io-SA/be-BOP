<script lang="ts">
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.digitalFile.listTitle')}</h1>

<a href="{data.adminPrefix}/digital-file/new" class="block underline"
	>{t('admin.digitalFile.newFile')}</a
>

<div class="flex flex-row flex-wrap gap-6">
	{#each data.files as file}
		<div class="flex flex-col text-center">
			<a
				href="{data.adminPrefix}/digital-file/{file._id}"
				class="flex flex-col items-center underline body-hyperlink"
			>
				<h2 class="text-xl">{file.name}</h2>
			</a>
		</div>
	{/each}
</div>
