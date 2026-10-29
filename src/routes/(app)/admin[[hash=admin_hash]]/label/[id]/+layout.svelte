<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/label/${$page.params.id}`, name: t('admin.label.editLabelTab') },
		{
			href: `${data.adminPrefix}/label/${$page.params.id}/translations`,
			name: t('admin.label.translationsTab')
		}
	]}
/>

<slot />
