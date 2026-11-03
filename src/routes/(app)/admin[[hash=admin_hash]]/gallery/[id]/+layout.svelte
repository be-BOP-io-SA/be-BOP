<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	const { t } = useI18n();

	export let data;
</script>

<TabLinksHeader
	tabs={[
		{
			href: `${data.adminPrefix}/gallery/${$page.params.id}`,
			name: t('admin.gallery.editGallery')
		},
		{
			href: `${data.adminPrefix}/gallery/${$page.params.id}/translations`,
			name: t('admin.gallery.translationsTab')
		}
	]}
/>

<slot />
