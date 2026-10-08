<script>
	import SpecificationWidget from '$lib/components/SpecificationWidget.svelte';
	import CmsTagSnippet from '$lib/components/CmsTagSnippet.svelte';
	import { page } from '$app/stores';

	export let data;
</script>

<CmsTagSnippet tag="[Specification={$page.params.id}]" />
<SpecificationWidget specification={data.specification} />
