<script lang="ts">
	import { onMount } from 'svelte';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	let uploading = false;
	let cacheBuster = 0;
	onMount(() => {
		cacheBuster = Date.now();
	});
</script>

<h1 class="text-3xl">{t('admin.product.addDefaultPictureTitle')}</h1>

<form method="post" class="flex flex-col gap-4" enctype="multipart/form-data">
	{t('admin.product.currentPicture')}
	<!-- svelte-ignore a11y-img-redundant-alt -->
	<img
		srcset="/asset/default-picture.png?t={cacheBuster}"
		alt="default-picture"
		class="w-24 h-24"
	/>

	<label>
		{t('admin.product.fileLabel')}
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
		value={t('admin.product.addValue')}
		disabled={uploading}
	/>
</form>
