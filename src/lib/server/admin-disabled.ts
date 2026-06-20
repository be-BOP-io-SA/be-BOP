/**
 * Returns true if `path` (raw request path) targets an admin entry disabled by the deployment.
 * `disabledEntries` are canonical hrefs (e.g. ['/admin/sumup']); the admin prefix in `path` is normalized.
 */
export function isAdminPathDisabled(path: string, disabledEntries: string[]): boolean {
	if (disabledEntries.length === 0) {
		return false;
	}
	const normalized = path.replace(/^\/admin-[a-zA-Z0-9]+/, '/admin');
	return disabledEntries.some(
		(entry) => normalized === entry || normalized.startsWith(entry + '/')
	);
}
