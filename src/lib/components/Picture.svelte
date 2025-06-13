<script lang="ts">
	import type { Picture } from '$lib/types/Picture';

	export let picture: Picture | undefined;
	let className = '';
	export { className as class };
	export let style = '';

	let matchedWidth: number | null = null;
	let maxWidth: boolean;
	let matchedHeight: number | null = null;
	let maxHeight: boolean;

	$: {
		const match4px = className.match(/(\s|^)(max-)?w-(\d+)(\s|$)/);
		if (match4px) {
			matchedWidth = parseInt(match4px[3]) * 4;
			maxWidth = match4px[2] === 'max-';
		} else {
			const matchPx = className.match(/(\s|^)(max-)?w-\[(\d+)px](\s|$)/);
			if (matchPx) {
				matchedWidth = parseInt(matchPx[3]);
				maxWidth = matchPx[2] === 'max-';
			} else {
				matchedWidth = null;
			}
		}
	}

	$: {
		const match4px = className.match(/(\s|^)(max-)?h-(\d+)(\s|$)/);
		if (match4px) {
			matchedHeight = parseInt(match4px[3]) * 4;
			maxHeight = match4px[2] === 'max-';
		} else {
			const matchPx = className.match(/(\s|^)(max-)?h-\[(\d+)px](\s|$)/);
			if (matchPx) {
				matchedHeight = parseInt(matchPx[3]);
				maxHeight = matchPx[2] === 'max-';
			} else {
				matchedHeight = null;
			}
		}
	}

	let computedWidth: number | null = null;
	let computedHeight: number | null = null;
	let maxComputedWidth: number | null = null;

	$: {
		if (matchedWidth !== null && !maxWidth) {
			computedWidth = null;
		} else if (matchedHeight !== null && !maxHeight && picture) {
			computedWidth = Math.round(
				(matchedHeight / picture.storage.original.height) * picture.storage.original.width
			);
		} else {
			computedWidth = null;
		}
	}

	$: {
		if (matchedHeight !== null && !maxHeight) {
			computedHeight = null;
		} else if (matchedWidth !== null && !maxWidth && picture) {
			computedHeight = Math.round(
				(matchedWidth / picture.storage.original.width) * picture.storage.original.height
			);
		} else {
			computedHeight = null;
		}
	}

	// If max width or max hegiht is set, while width/height are not set. Use the more restrictive computed width.
	$: {
		if ((matchedWidth !== null && !maxWidth) || (matchedHeight !== null && !maxHeight)) {
			maxComputedWidth = null;
		} else {
			let max1: number | null = null;
			let max2: number | null = matchedWidth;

			if (matchedHeight !== null && picture) {
				max1 = Math.round(
					(matchedHeight / picture.storage.original.height) * picture.storage.original.width
				);
			}
			if (max1 !== null || max2 !== null) {
				maxComputedWidth = Math.min(max1 ?? Infinity, max2 ?? Infinity);
			} else {
				maxComputedWidth = null;
			}
		}
	}

	$: computedStyle = `${computedWidth !== null ? `width: ${computedWidth}px;` : ''} ${
		computedHeight !== null ? `height: ${computedHeight}px;` : ''
	} ${style};`;
	$: sizeHint =
		matchedWidth !== null && !maxWidth ? matchedWidth : computedWidth ?? maxComputedWidth;
	function handleError(event: Event) {
		let cacheBuster: number = Date.now();
		(event.target as HTMLImageElement).srcset = '';
		(event.target as HTMLImageElement).sizes = '';
		(event.target as HTMLImageElement).srcset = `/asset/default-picture.png?t=${cacheBuster}`;
	}
</script>

{#if picture}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<img
		alt={picture.name}
		width={picture.storage.formats[0].width}
		height={picture.storage.formats[0].height}
		src={picture.storage.formats
			.map((format) => `/picture/raw/${picture?._id}/format/${format.width}?v=1 ${format.width}w`)
			.join(', ')}
		srcset={picture.storage.formats
			.map((format) => `/picture/raw/${picture?._id}/format/${format.width}?v=1 ${format.width}w`)
			.join(', ')}
		sizes={sizeHint !== null ? `${sizeHint}px` : undefined}
		class={className}
		style={computedStyle}
		on:error={handleError}
		{...$$restProps}
		on:keypress
		on:click
		on:load
	/>
{/if}

<style>
	img.hover-zoom {
		transition: 400ms;

		transform: scale(1);
	}

	img:hover.hover-zoom {
		transform: scale(1.2);
	}
</style>
