<script>
	import GalleryWidget from '$lib/components/GalleryWidget/GalleryWidget.svelte';
	import CmsTagSnippet from '$lib/components/CmsTagSnippet.svelte';

	export let data;
</script>

<CmsTagSnippet tag="[Gallery={data.gallery._id}]" />
<GalleryWidget pictures={data.pictures} gallery={data.gallery} />
