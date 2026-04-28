#!/usr/bin/env node
// Generates static/css/wp-imported.css by reading the @wordpress/block-library
// CSS bundle and prefixing every selector under .wp-imported, so WordPress
// migrated content can render with WP block styling without polluting the
// rest of the be-BOP page.
//
// Run automatically by `npm run dev` and `npm run build`. Output is
// gitignored — re-run `npm run build:wp-css` after bumping
// @wordpress/block-library.

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import prefixer from 'postcss-prefix-selector';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const SCOPE = '.wp-imported';
const SOURCES = [
	'node_modules/@wordpress/block-library/build-style/style.css',
	'node_modules/@wordpress/block-library/build-style/theme.css'
];
const OUTPUT = 'static/css/wp-imported.css';

async function exists(p) {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const cssChunks = [];
	for (const rel of SOURCES) {
		const abs = resolve(repoRoot, rel);
		if (!(await exists(abs))) {
			console.warn(`[wp-imported-css] source not found, skipping: ${rel}`);
			continue;
		}
		cssChunks.push(`/* ${rel} */`);
		cssChunks.push(await readFile(abs, 'utf8'));
	}

	if (cssChunks.length === 0) {
		console.warn(
			'[wp-imported-css] no source CSS available (is @wordpress/block-library installed?). ' +
				'Writing empty stylesheet so the static asset still resolves.'
		);
		const outPath = resolve(repoRoot, OUTPUT);
		await mkdir(dirname(outPath), { recursive: true });
		await writeFile(
			outPath,
			'/* @wordpress/block-library not installed — run pnpm install */\n',
			'utf8'
		);
		return;
	}

	const result = await postcss([
		prefixer({
			prefix: SCOPE,
			// Replace `:root` and bare html/body with the scope so CSS variables
			// and resets land on .wp-imported instead of the global tree.
			transform(prefix, selector, prefixedSelector) {
				if (selector === ':root' || selector === 'html' || selector === 'body') {
					return prefix;
				}
				return prefixedSelector;
			}
		})
	]).process(cssChunks.join('\n\n'), { from: undefined });

	const outPath = resolve(repoRoot, OUTPUT);
	await mkdir(dirname(outPath), { recursive: true });
	await writeFile(outPath, result.css, 'utf8');
	console.log(`[wp-imported-css] wrote ${OUTPUT} (${result.css.length} bytes, scope ${SCOPE})`);
}

main().catch((err) => {
	console.error('[wp-imported-css] failed:', err);
	process.exit(1);
});
