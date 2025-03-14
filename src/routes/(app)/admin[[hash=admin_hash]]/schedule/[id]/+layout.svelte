<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';

	export let data;
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/schedule/${$page.params.id}`, name: 'Edit schedule' },
		{
			href: `#`,
			name: 'Translations'
		}
	]}
/>

<slot />
