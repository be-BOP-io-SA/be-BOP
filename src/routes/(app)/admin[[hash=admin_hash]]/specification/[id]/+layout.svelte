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
			href: `${data.adminPrefix}/specification/${$page.params.id}`,
			name: t('admin.specification.editSpecification')
		},
		{
			href: `${data.adminPrefix}/specification/${$page.params.id}/translations`,
			name: t('admin.specification.translationsTab')
		}
	]}
/>

<slot />
