<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { TagWidgetTag } from '$lib/types/Tag';
	import { typedInclude } from '$lib/utils/typedIncludes';
	import { typedKeys } from '$lib/utils/typedKeys';
	import TagWidgetVariation1 from './TagWidget/TagWidgetVariation1.svelte';
	import TagWidgetVariation2 from './TagWidget/TagWidgetVariation2.svelte';
	import TagWidgetVariation3 from './TagWidget/TagWidgetVariation3.svelte';
	import TagWidgetVariation4 from './TagWidget/TagWidgetVariation4.svelte';
	import TagWidgetVariation5 from './TagWidget/TagWidgetVariation5.svelte';
	import TagWidgetVariation6 from './TagWidget/TagWidgetVariation6.svelte';
	import TagWidgetVariation1CtAless from './TagWidget/TagWidgetVariation1CTAless.svelte';
	import TagWidgetVariation4Reverse from './TagWidget/TagWidgetVariation4Reverse.svelte';
	import TagWidgetVariation1noBG from './TagWidget/TagWidgetVariation1noBG.svelte';
	import TagWidgetVariation1Reverse from './TagWidget/TagWidgetVariation1Reverse.svelte';
	import type { CmsToken } from '$lib/server/cms';

	let className = '';
	export { className as class };
	export let tag: TagWidgetTag;
	export let pictures: Picture[];
	export let displayOption = 'var-1';
	export let titleCase: Extract<CmsToken, { type: 'tagWidget' }>['titleCase'] = 'upper';

	$: titleClassNames = titleCase === 'upper' ? 'uppercase' : '';
	const widgets = {
		'var-1': {
			component: TagWidgetVariation1,
			pictureType: 'full'
		},
		'var-1-noCTA': {
			component: TagWidgetVariation1CtAless,
			pictureType: 'full'
		},
		'var-1-noBG': {
			component: TagWidgetVariation1noBG,
			pictureType: 'full'
		},
		'var-1-reverse': {
			component: TagWidgetVariation1Reverse,
			pictureType: 'full'
		},

		'var-2': {
			component: TagWidgetVariation2,
			pictureType: 'wide'
		},
		'var-3': {
			component: TagWidgetVariation3,
			pictureType: 'main'
		},
		'var-4': {
			component: TagWidgetVariation4,
			pictureType: 'avatar'
		},
		'var-4-reverse': {
			component: TagWidgetVariation4Reverse,
			pictureType: 'avatar'
		},
		'var-5': {
			component: TagWidgetVariation5,
			pictureType: 'slim'
		},
		'var-6': {
			component: TagWidgetVariation6,
			pictureType: 'slim'
		}
	};

	$: widget = typedInclude(typedKeys(widgets), displayOption) ? widgets[displayOption] : null;
</script>

{#if widget}
	<svelte:component
		this={widget.component}
		{tag}
		picture={pictures.find((picture) => picture.tag?.type === widget?.pictureType)}
		avatar={pictures.find((picture) => picture.tag?.type === 'avatar')}
		class={className}
		{titleClassNames}
	/>
{/if}
