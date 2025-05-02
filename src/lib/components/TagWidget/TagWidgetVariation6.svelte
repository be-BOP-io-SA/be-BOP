<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { Tag } from '$lib/types/Tag';
	import PictureComponent from '../Picture.svelte';

	let className = '';
	export { className as class };
	export let tag: Pick<
		Tag,
		'_id' | 'name' | 'title' | 'subtitle' | 'content' | 'shortContent' | 'cta'
	>;
	export let picture: Picture | undefined;
	export let titleClassNames = '';
</script>

<div class="mx-auto tagWidget tagWidget-main gap-4 rounded relative {className}">
	<PictureComponent {picture} class="w-full" />
	<div class="flex flex-col text-center justify-center">
		<div
			class="top-6 mx-auto text-center absolute md:top-12 lg:top-28 left-0 bg-[rgba(243,240,240,0.5)]"
		>
			<h2 class="text-sm {titleClassNames} md:text-2xl lg:text-5xl body-title">{tag.title}</h2>
		</div>
		{#if tag.cta.length}
			<div
				class="btn text-sm tagWidget-cta absolute bottom-0 right-0 md:text-xl lg:text-xl text-center w-auto p-2 m-2"
			>
				<a
					class="tagWidget-hyperlink"
					href={tag.cta[0].href.startsWith('http') || tag.cta[0].href.includes('/')
						? tag.cta[0].href
						: `/${tag.cta[0].href}`}
					target={tag.cta[0].href.startsWith('http') || tag.cta[0].openNewTab ? '_blank' : '_self'}
					>{tag.cta[0].label}</a
				>
			</div>
		{/if}
	</div>
</div>
