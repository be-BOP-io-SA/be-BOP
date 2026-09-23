<script lang="ts">
	import type { Picture } from '$lib/types/Picture';
	import type { Gallery, GalleryBase } from '$lib/types/Gallery';
	import PictureComponent from '../Picture.svelte';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { safeHref } from '$lib/utils/safeUrl';
	import { TinySlider } from 'svelte-tiny-slider';

	export let pictures: Picture[];
	export let gallery: Pick<Gallery, '_id' | 'name' | 'principal' | 'secondary'>;
	export let displayOption = 'var-1';

	let className = '';
	export { className as class };
	$: pictureById = Object.fromEntries(pictures.map((picture) => [picture._id, picture]));
	let gallerySecondaryMobile = [...gallery.secondary, gallery.principal];
	gallerySecondaryMobile.unshift(gallerySecondaryMobile.pop() as GalleryBase);
</script>

<div
	class="mx-auto hidden lg:flex rounded justify-center {className} {displayOption === 'var-2'
		? 'flex-row-reverse'
		: ''}"
>
	<div class="flex-col w-[34%]">
		<div class="tagWidget tagWidget-main m-2 p-4">
			<h2 class="text-2xl body-title pb-2 uppercase">{gallery.principal.title}</h2>
		</div>
		<div class="btn tagWidget-cta text-xl text-center w-auto m-2 p-4">
			<a
				class="tagWidget-hyperlink"
				href={safeHref(gallery.principal.cta.href)}
				target={gallery.principal.cta.href.startsWith('http') || gallery.principal.cta.openNewTab
					? '_blank'
					: '_self'}>{gallery.principal.cta.label}</a
			>
		</div>
		<div class="tagWidget tagWidget-main m-2 p-4">
			<!-- `marked` émet déjà des blocs <p> : les imbriquer dans un <p> produirait un
			     document que le navigateur reparse différemment du HTML rendu au serveur. -->
			<div class="min-h-[37em] mt-2">
				<!-- eslint-disable svelte/no-at-html-tags -->
				{@html renderMarkdown(gallery.principal.content)}
			</div>
		</div>
	</div>
	{#each gallery.secondary as secondary}
		<div class="flex-col w-[22%]">
			<div class="m-2 justify-items-center">
				<PictureComponent
					picture={pictureById[secondary.pictureId || '']}
					class="block h-auto w-auto"
				/>
			</div>

			<div class="m-2 tagWidget tagWidget-main p-4 text-center">
				<h2 class="text-xl body-title pb-2 uppercase min-h-[4em]">{secondary.title}</h2>
			</div>
			<div class="m-2 tagWidget tagWidget-main p-4 text-center">
				<div class="min-h-[12em] mt-2">
					<!-- eslint-disable svelte/no-at-html-tags -->
					{@html renderMarkdown(secondary.content)}
				</div>
			</div>
			<div class="btn tagWidget-cta text-xl text-center w-auto p-4 m-2">
				<a
					class="tagWidget-hyperlink"
					href={safeHref(secondary.cta.href)}
					target={secondary.cta.href.startsWith('http') || secondary.cta.openNewTab
						? '_blank'
						: '_self'}>{secondary.cta.label}</a
				>
			</div>
		</div>
	{/each}
</div>

<div
	class="relative mx-auto lg:hidden flex rounded justify-center {className} {displayOption ===
	'var-2'
		? 'flex-row-reverse'
		: ''}"
>
	<TinySlider>
		{#snippet children({ currentIndex })}
			{#each gallerySecondaryMobile as slide, i}
				<div class="grid grid-cols-6 justify-center">
					{#if currentIndex === i}
						<div class="col-span-6 p-2 m-2 mx-12 tagWidget tagWidget-main text-center">
							<h2 class="text-xl body-title pb-2 uppercase">
								{slide.title}
							</h2>
						</div>
						<div class="col-span-6 m-2 justify-center items-center">
							<PictureComponent
								picture={pictureById[slide.pictureId || '']}
								class="block h-auto w-auto"
							/>
						</div>
						<div class="col-span-6 m-2 tagWidget tagWidget-main text-center">
							<div class="m-2">
								<!-- eslint-disable svelte/no-at-html-tags -->
								{@html renderMarkdown(slide.content)}
							</div>
						</div>
						<div class="col-span-6 btn tagWidget-cta text-xl w-auto p-4 m-2">
							<a
								class="tagWidget-hyperlink"
								href={safeHref(slide.cta.href)}
								target={slide.cta.href.startsWith('http') || slide.cta.openNewTab
									? '_blank'
									: '_self'}>{slide.cta.label}</a
							>
						</div>
					{/if}
				</div>
			{/each}
		{/snippet}
		{#snippet controls({ setIndex, currentIndex })}
			<div class="absolute top-0 left-0 flex items-center py-3">
				{#if currentIndex > 0}
					<button
						class="body-mainCTA px-4 py-2 rounded-full"
						on:click={() => setIndex(currentIndex - 1)}>&#9664;</button
					>
				{/if}
			</div>
			<div class="absolute top-0 right-0 flex items-center py-3">
				{#if currentIndex < gallerySecondaryMobile.length - 1}
					<button
						class="body-mainCTA px-4 py-2 rounded-full"
						on:click={() => setIndex(currentIndex + 1)}>&#9654;</button
					>
				{/if}
			</div>
		{/snippet}
	</TinySlider>
</div>
