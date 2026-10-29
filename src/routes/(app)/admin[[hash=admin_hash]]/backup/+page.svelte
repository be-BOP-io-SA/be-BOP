<script lang="ts">
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
</script>

<h1 class="text-3xl">{t('admin.backup.title')}</h1>

<a href="{data.adminPrefix}/backup/create" class="underline">{t('admin.backup.createLink')}</a>
<a href="{data.adminPrefix}/backup/import" class="underline">{t('admin.backup.importLink')}</a>
