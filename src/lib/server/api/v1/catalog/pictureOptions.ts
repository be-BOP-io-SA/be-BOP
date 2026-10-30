/**
 * How a request wants pictures rendered.
 *
 * Kept apart from `pictures.ts` so that parsing two query parameters does not pull the S3 client
 * into a route's import graph.
 */

/**
 * The widths upload generates: one webp per step below the source, plus a full-size one when the
 * source is already under 2048. A small source therefore has fewer of these, and an arbitrary
 * source width can appear as the full-size format.
 *
 * Documented as the widths worth asking for, not as a closed set — `formats` on any catalog read
 * lists what a given picture actually has.
 */
export const GENERATED_PICTURE_WIDTHS = [128, 256, 512, 1024, 2048] as const;

/** `url` links into be-BOP; `data-uri` inlines the bytes; `none` omits the picture entirely. */
export const PICTURE_ENCODINGS = ['url', 'data-uri', 'none'] as const;
export type PictureEncoding = (typeof PICTURE_ENCODINGS)[number];

export type PictureOptions = {
	encoding: PictureEncoding;
	/** A target width in pixels, or every generated size. */
	size: number | 'all';
};

export const DEFAULT_PICTURE_OPTIONS: PictureOptions = { encoding: 'url', size: 'all' };

export type PictureOptionError = { field: string; message: string };

/**
 * Both parameters are rejected rather than defaulted when unrecognised: silently serving a
 * different encoding or size than the one asked for is worse than saying no.
 */
export function parsePictureOptions(
	picture: string | undefined,
	sizes: string | undefined
): { options: PictureOptions } | { error: PictureOptionError } {
	const options = { ...DEFAULT_PICTURE_OPTIONS };

	const encoding = picture?.trim().toLowerCase();
	if (encoding) {
		if (!(PICTURE_ENCODINGS as readonly string[]).includes(encoding)) {
			return {
				error: {
					field: 'picture',
					message: `picture must be one of: ${PICTURE_ENCODINGS.join(', ')}`
				}
			};
		}
		options.encoding = encoding as PictureEncoding;
	}

	const size = sizes?.trim().toLowerCase();
	if (size && size !== 'all') {
		const width = Number.parseInt(size, 10);
		if (!Number.isSafeInteger(width) || width < 1 || String(width) !== size) {
			return {
				error: {
					field: 'sizes',
					message: `sizes must be "all" or a width in pixels (typically ${GENERATED_PICTURE_WIDTHS.join(
						', '
					)})`
				}
			};
		}
		options.size = width;
	}

	return { options };
}
