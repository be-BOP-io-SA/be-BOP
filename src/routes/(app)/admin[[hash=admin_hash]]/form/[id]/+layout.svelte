<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';
	import { useI18n } from '$lib/i18n';

	export let data;

	const { t } = useI18n();
</script>

<TabLinksHeader
	tabs={[
		{
			href: `${data.adminPrefix}/form/${$page.params.id}`,
			name: t('admin.form.editContactFormTab')
		},
		{
			href: `${data.adminPrefix}/form/${$page.params.id}/translations`,
			name: t('admin.form.translationsTab')
		}
	]}
/>
<p>
	<kbd class="kbd body-secondaryCTA">{'{{websiteLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{brandName}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{pageLink}}'}</kbd>
	{t('admin.form.and')}
	<kbd class="kbd body-secondaryCTA">{'{{pageName}}'}</kbd>
	{t('admin.form.alwaysAvailableInTemplates')}
</p>
<slot />
