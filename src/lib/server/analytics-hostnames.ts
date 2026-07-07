/**
 * Extract unique hostnames referenced by the admin-pasted analytics script snippet. Surfaced in
 * the GDPR consent banner so the visitor sees where their visit data is sent ("plausible.io",
 * "amplitude.com", …).
 *
 * Inline snippets that don't reference an external URL (e.g. a self-built pixel tag) return [];
 * the caller falls back to a generic "Analytics" label in that case.
 */
export function extractAnalyticsHostnames(snippet: string | undefined | null): string[] {
	if (!snippet) {
		return [];
	}
	// Also match protocol-relative URLs (//host/…) — a common vendor snippet form.
	const matches = snippet.match(/(?:https?:)?\/\/[a-zA-Z0-9.\-]+/g);
	if (!matches) {
		return [];
	}
	const hostnames = new Set<string>();
	for (const m of matches) {
		try {
			const url = m.startsWith('//') ? `https:${m}` : m;
			hostnames.add(new URL(url).hostname);
		} catch {
			// ignore malformed URLs
		}
	}
	return Array.from(hostnames).sort();
}
