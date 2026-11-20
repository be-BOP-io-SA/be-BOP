<script>
	import CarouselWidget from '$lib/components/CarouselWidget.svelte';
	import CmsTagSnippet from '$lib/components/CmsTagSnippet.svelte';
	import { page } from '$app/stores';

	export let data;
</script>

<CmsTagSnippet tag="[Slider={$page.params.id}?autoplay=3000]" />
<CarouselWidget autoplay={3000} pictures={data.pictures} />
