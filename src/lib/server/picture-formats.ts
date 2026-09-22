import type { ImageData, Picture } from '$lib/types/Picture';

/**
 * Kept apart from the modules that read or sign objects: selecting a format is arithmetic on a
 * document, and pulling an S3 client into a route's import graph to do it is a layering mistake.
 */

/**
 * Every format with a usable key and dimensions, smallest first.
 *
 * The sort has to be deterministic: an ETag over a serialized catalog is only stable if the array
 * is. It also puts the default at index 0.
 */
export function usableFormats(picture: Picture): ImageData[] {
	return (picture.storage?.formats ?? [])
		.filter((format) => format.key && format.width && format.height)
		.sort((a, b) => a.width * a.height - b.width * b.height || a.size - b.size);
}

/**
 * Upload generates a webp per step of 2048/1024/512/256/128 the source exceeds, plus a full-size
 * one when the source is already under 2048 — so a small source yields a single format.
 */
export function lowestResolutionFormat(picture: Picture): ImageData | null {
	return usableFormats(picture)[0] ?? null;
}

/**
 * The formats a request asked to see, smallest first. Empty when the picture has none.
 *
 * A width resolves to the largest format at or below it, and to the smallest when even that is too
 * large — so a picture is never missing because of the width asked for.
 */
export function selectFormats(picture: Picture, size: number | 'all'): ImageData[] {
	const formats = usableFormats(picture);
	if (size === 'all' || !formats.length) {
		return formats;
	}
	const atOrBelow = formats.filter((format) => format.width <= size);
	return [atOrBelow.length ? atOrBelow[atOrBelow.length - 1] : formats[0]];
}
