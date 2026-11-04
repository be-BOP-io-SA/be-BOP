/**
 * Returns the path, query and hash of `target` when it stays on `origin`, undefined otherwise.
 */
export function sameOriginPath(target: string, origin: string): string | undefined {
	// Browsers drop tabs and newlines from a URL and read "\" as "/", so "/\t/host" leaves the shop.
	if (/[\p{Cc}\\]/u.test(target)) {
		return undefined;
	}

	let url: URL;
	try {
		url = new URL(target, origin);
	} catch {
		return undefined;
	}

	if (url.origin !== new URL(origin).origin) {
		return undefined;
	}

	return url.pathname + url.search + url.hash;
}
