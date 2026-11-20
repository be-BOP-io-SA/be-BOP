<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import CmsForm from '$lib/components/CmsForm.svelte';
	import { page } from '$app/stores';

	const { t } = useI18n();

	let pageId = $page.url.searchParams.get('id') || null;
</script>

<h1 class="text-3xl">{t('admin.cms.addPageTitle')}</h1>

<form method="post" class="flex flex-col gap-4">
	<CmsForm cmsPage={null} slug={pageId || ''} />
</form>
