import { runtimeConfig } from './runtime-config';

export function adminPrefix(): string {
	return runtimeConfig.adminHash ? `/admin-${runtimeConfig.adminHash}` : '/admin';
}

/**
 * The pathname as SvelteKit's router sees it, using the same normalisation the router applies
 * before matching. Guards must read this and never the raw pathname: the router decodes first,
 * so `/%61dmin/arm` reaches the admin tree while a raw-string check reads it as public.
 */
export function routedPathname(pathname: string): string {
	return pathname.split('%25').map(decodeURI).join('%25');
}

/**
 * The `/admin…` prefix of a path, or null when the path is not in the admin tree.
 *
 * Must stay at least as permissive as the `admin_hash` param matcher: a prefix that routes into
 * the admin tree but reads as non-admin here would skip every check in `hooks.server.ts`.
 */
export function adminPathPrefix(pathname: string): string | null {
	// Mirrors the `admin_hash` matcher exactly. Broader than that — `[^/]*` — and a public CMS
	// page slugged `administration` reads as a wrong-prefix admin URL and 403s every visitor.
	return /^(\/admin(-[a-zA-Z0-9]+)?)(\/|$)/.exec(pathname)?.[1] ?? null;
}
