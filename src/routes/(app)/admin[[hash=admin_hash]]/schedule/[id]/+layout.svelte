<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';

	export let data;
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/schedule/${$page.params.id}`, name: 'Edit schedule' },
		{
			href: `${data.adminPrefix}/schedule/${$page.params.id}/system-events`,
			name: 'System events'
		},
		{
			href: `#`,
			name: 'Translations'
		}
	]}
/>

<slot />
