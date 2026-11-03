<script lang="ts">
	import { useI18n } from '$lib/i18n';
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';

	const { t } = useI18n();

	export let data;
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/cms/${$page.params.slug}`, name: t('admin.cms.editTab') },
		{
			href: `${data.adminPrefix}/cms/${$page.params.slug}/translations`,
			name: t('admin.cms.translationsTab')
		}
	]}
/>

<slot />
