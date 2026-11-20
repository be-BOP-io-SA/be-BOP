// Built into the app, since a release ships without the source tree.
// Never inlined: the asset route redirects to this URL, and browsers refuse a redirect to data:.
const assets = import.meta.glob<string>('/src/lib/assets/*', {
	eager: true,
	import: 'default',
	query: '?no-inline'
});

export function bundledAssetUrl(filename: string): string | undefined {
	return assets[`/src/lib/assets/${filename}`];
}
