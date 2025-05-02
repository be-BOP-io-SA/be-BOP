<script lang="ts">
	import type { Tag } from '$lib/types/Tag';
	import type { Picture } from '$lib/types/Picture';
	import PictureComponent from '../Picture.svelte';
	import VariationFourTemplateWidget from './TagWidgetVariation4.svelte';
	import { marked } from 'marked';

	let className = '';
	export { className as class };

	export let tag: Pick<
		Tag,
		'_id' | 'name' | 'title' | 'subtitle' | 'content' | 'shortContent' | 'cta'
	>;
	export let picture: Picture | undefined;
	export let avatar: Picture | undefined;
	export let titleClassNames = '';
</script>

<div class="hidden sm:inline">
	<div class="flex">
		<div
			class="mx-auto tagWidget tagWidget-main flex rounded sm:gap-2 {className} flex-row-reverse"
		>
			<div class="flex flex-col w-[50%] m-2">
				<h2 class="text-6xl body-title pb-2 {titleClassNames}">{tag.title}</h2>
				<h2 class="text-md md:text-xl">
					<!-- eslint-disable svelte/no-at-html-tags -->
					{@html marked(tag.content.replaceAll('<', '&lt;'))}
				</h2>
				<div class="flex text-centern justify-between mt-auto">
					{#each tag.cta as cta}
						<div class="btn tagWidget-cta text-xl text-center w-auto p-1">
							<a
								class="tagWidget-hyperlink"
								href={cta.href.startsWith('http') || cta.href.includes('/')
									? cta.href
									: `/${cta.href}`}
								target={cta.href.startsWith('http') || cta.openNewTab ? '_blank' : '_self'}
								>{cta.label}</a
							>
						</div>
					{/each}
				</div>
			</div>

			<div class="flex w-[50%] mb-2">
				<PictureComponent {picture} class="w-auto h-full object-cover" />
			</div>
		</div>
	</div>
</div>

<svelte:component
	this={VariationFourTemplateWidget}
	{tag}
	picture={avatar}
	{avatar}
	class="{className} sm:hidden"
/>
