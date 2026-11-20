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
			href: `${data.adminPrefix}/countdown/${$page.params.id}`,
			name: t('admin.countdown.editTab')
		},
		{
			href: `${data.adminPrefix}/countdown/${$page.params.id}/translations`,
			name: t('admin.countdown.translationsTab')
		}
	]}
/>

<slot />
