<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();

	const tabs = [
		{ name: t('admin.template.emails'), href: `${data.adminPrefix}/template/emails` },
		{ name: 'NostR', href: `${data.adminPrefix}/template/nostr` }
	];
</script>

<TabLinksHeader {tabs} />

<slot />
