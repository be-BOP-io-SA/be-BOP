<script lang="ts">
	import CmsForm from '$lib/components/CmsForm.svelte';

	export let data;
</script>

<CmsForm cmsPage={data.cmsPage} removedContent={data.removedContent} />
