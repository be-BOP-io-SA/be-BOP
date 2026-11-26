<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';
	import { MAX_DIGITAL_FILE_SIZE } from '$lib/types/DigitalFile';
	import { sendToStorage, type StorageUploadFailure } from '$lib/utils/sendToStorage';

	const { t } = useI18n();

	function failureMessage(failure: StorageUploadFailure): string {
		switch (failure) {
			case 'tooLarge':
				return t('admin.digitalFile.uploadTooLarge', { max: MAX_DIGITAL_FILE_SIZE / 1_000_000 });
			case 'sessionExpired':
				return t('admin.digitalFile.uploadSessionExpired');
			case 'storageRefused':
				return t('admin.digitalFile.uploadFailed');
		}
	}

	const productId = $page.url.searchParams.get('productId');
	export let data;

	let files: FileList | null = null;
	let name = '';

	let uploading = false;
	async function handleSubmit() {
		if (!files || files.length === 0) {
			alert(t('admin.digitalFile.selectFileAlert'));
			return;
		}
		try {
			uploading = true;
			const sent = await sendToStorage<{ uploadUrl: string; digitalFileId: string }>(files[0], {
				url: `${data.adminPrefix}/digital-file/prepare`,
				body: { name, fileName: files[0].name, fileSize: files[0].size, productId },
				maxSize: MAX_DIGITAL_FILE_SIZE
			});
			if ('failure' in sent) {
				alert(failureMessage(sent.failure));
				return;
			}
			const { digitalFileId } = sent.prepared;

			const finalizeResponse = await fetch(`${data.adminPrefix}/digital-file/finalize`, {
				method: 'POST',
				body: JSON.stringify({
					digitalFileId
				}),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!finalizeResponse.ok) {
				throw new Error(await finalizeResponse.text());
			}

			await goto(`${data.adminPrefix}/digital-file/${digitalFileId}`);
		} catch (error) {
			console.error('Digital file upload failed:', error);
			alert(t('admin.digitalFile.uploadFailed'));
		} finally {
			uploading = false;
		}
	}
</script>

<h1 class="text-3xl">{t('admin.digitalFile.addTitle')}</h1>

<form method="post" class="flex flex-col gap-4" on:submit|preventDefault={handleSubmit}>
	<label>
		{t('admin.digitalFile.nameLabel')}
		<input
			class="form-input block"
			type="text"
			name="name"
			placeholder={t('admin.digitalFile.finalNamePlaceholder')}
			bind:value={name}
			required
		/>
	</label>

	<label>
		{t('admin.digitalFile.fileLabel')}
		<input type="file" class="block" bind:files required />
	</label>

	{#if productId}
		<p>
			{t('admin.digitalFile.associatedProduct')}
			<a href="{data.adminPrefix}/product/{productId}" class="hover:underline">{productId} </a>
		</p>
	{/if}

	{#if !uploading}
		<input type="submit" class="btn body-mainCTA self-start" value={t('admin.digitalFile.add')} />
	{:else}
		<p>{t('admin.digitalFile.uploading')}</p>
	{/if}
</form>
