// Built into the app, since a release ships without the source tree.
const assets = import.meta.glob<string>('/src/lib/assets/*', { eager: true, import: 'default' });

export function bundledAssetUrl(filename: string): string | undefined {
	return assets[`/src/lib/assets/${filename}`];
}
