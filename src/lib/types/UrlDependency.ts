export enum UrlDependency {
	Cart = 'data:cart',
	CtiOrderNotification = 'data:ctiOrderNotification',
	Order = 'data:order'
}

// orderTab is semantically part of UrlDependency.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace UrlDependency {
	export function orderTab(tabSlug: string): string {
		return `data:orderTab/${tabSlug}`;
	}
}
