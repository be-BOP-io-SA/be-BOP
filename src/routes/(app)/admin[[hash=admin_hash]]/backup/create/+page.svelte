<script lang="ts">
	import { downloadFile } from '$lib/utils/downloadFile';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;

	async function exportData() {
		const response = await fetch(`${data.adminPrefix}/backup/create`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ exportType: 'all' })
		});

		if (!response.ok) {
			alert(
				t('admin.backup.exportError', { status: response.status, message: await response.text() })
			);
		}

		const blob = await response.blob();
		downloadFile(blob, 'backup.json');
	}
</script>

<h1 class="text-3xl">{t('admin.backup.exportTitle')}</h1>
<button on:click={exportData} class="btn btn-black self-start"
	>{t('admin.backup.exportButton')}</button
>
