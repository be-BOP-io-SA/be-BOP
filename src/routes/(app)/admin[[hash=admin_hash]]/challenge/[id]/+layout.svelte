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
			href: `${data.adminPrefix}/challenge/${$page.params.id}`,
			name: t('admin.challenge.tabEdit')
		},
		...(data.challenge?.ratio === 'perProduct'
			? [
					{
						href: `${data.adminPrefix}/challenge/${$page.params.id}/ratio-products`,
						name: t('admin.challenge.tabRatioProduct')
					}
			  ]
			: []),
		{
			href: `${data.adminPrefix}/challenge/${$page.params.id}/translations`,
			name: t('admin.challenge.tabTranslations')
		}
	]}
/>

<slot />
