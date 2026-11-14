<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/consent`, name: t('admin.consent.optinsTab') },
		{ href: `${data.adminPrefix}/consent/export`, name: t('admin.consent.exportTab') }
	]}
/>

<slot />
