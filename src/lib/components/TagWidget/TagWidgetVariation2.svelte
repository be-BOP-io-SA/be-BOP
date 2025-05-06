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

<div class="mx-auto tagWidget tagWidget-main rounded {className}">
	<div>
		<PictureComponent {picture} class="w-full" />

		<div class="flex flex-col p-2 text-center justify-center">
			<div class="mx-auto text-center">
				<h2
					class="text-md bg-[rgba(243,240,240,0.5)] {titleClassNames} md:text-6xl lg:text-6xl body-title"
				>
					{tag.title}
				</h2>
			</div>
			<h2 class="text-lg pb-2">
				{tag.shortContent}
			</h2>
			<div class="flex text-centern justify-evenly mt-auto mb-2">
				{#each tag.cta as cta}
					<div class="btn tagWidget-cta text-xl text-center w-auto p-3">
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
	</div>
</div>
