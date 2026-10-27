<script lang="ts">
	import { useI18n } from '$lib/i18n';

	let uploading = false;

	const { t } = useI18n();
</script>

<h1 class="text-3xl">{t('admin.schedule.addDefaultPictureTitle')}</h1>

<form method="post" class="flex flex-col gap-4" enctype="multipart/form-data">
	{t('admin.schedule.currentPicture')}
	<!-- svelte-ignore a11y-img-redundant-alt -->
	<img src="/asset/event-default-picture.png" alt="default-event-picture" class="w-24 h-24" />

	<label>
		{t('admin.schedule.file')}
		<input
			type="file"
			class="block"
			required
			name="file"
			accept="image/jpeg,image/png,image/webp"
		/>
	</label>

	<input
		type="submit"
		class="btn btn-gray self-start"
		value={t('admin.schedule.add')}
		disabled={uploading}
	/>
</form>
