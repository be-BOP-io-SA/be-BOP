<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';

	export let data;
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/form/${$page.params.id}`, name: 'Edit Contact Form' },
		{
			href: `${data.adminPrefix}/form/${$page.params.id}/translations`,
			name: 'Translations'
		}
	]}
/>
<p>
	<kbd class="kbd body-secondaryCTA">{'{{websiteLink}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{brandName}}'}</kbd>,
	<kbd class="kbd body-secondaryCTA">{'{{pageLink}}'}</kbd>
	and
	<kbd class="kbd body-secondaryCTA">{'{{pageName}}'}</kbd> are always available in templates.
</p>
<slot />
