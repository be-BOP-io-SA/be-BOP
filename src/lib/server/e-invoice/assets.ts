import { readFile } from 'fs/promises';
import { join } from 'path/posix';
import { rootDir } from '$lib/server/root-dir';

/**
 * Vendored assets for PDF/A-3 generation (assets/e-invoice/): PDF/A requires
 * every font to be embedded (no standard-14 fallback) and an OutputIntent with
 * an ICC profile. Cached after first read.
 */

let fontPromise: Promise<Buffer> | undefined;
let iccPromise: Promise<Buffer> | undefined;

export function notoSansRegular(): Promise<Buffer> {
	fontPromise ??= readFile(join(rootDir, 'assets/e-invoice/NotoSans-Regular.ttf'));
	return fontPromise;
}

export function srgbIccProfile(): Promise<Buffer> {
	iccPromise ??= readFile(join(rootDir, 'assets/e-invoice/sRGB-v2-micro.icc'));
	return iccPromise;
}
