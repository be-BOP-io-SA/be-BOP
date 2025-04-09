<script lang="ts">
	import TabLinksHeader from '$lib/components/TabLinksHeader.svelte';
	import { page } from '$app/stores';

	export let data;
</script>

<TabLinksHeader
	tabs={[
		{ href: `${data.adminPrefix}/challenge/${$page.params.id}`, name: 'Edit Challenge' },
		...(data.challenge?.ratio === 'perProduct'
			? [
					{
						href: `${data.adminPrefix}/challenge/${$page.params.id}/ratio-products`,
						name: 'Ratio / product'
					}
			  ]
			: []),
		{
			href: `${data.adminPrefix}/challenge/${$page.params.id}/translations`,
			name: 'Translations'
		}
	]}
/>

<slot />
