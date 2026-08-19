<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/layout`, name: t('admin.layout.editLayout') },
		{
			href: `${data.adminPrefix}/layout/translations`,
			name: t('admin.layout.translations')
		}
	]}
/>

<slot />
