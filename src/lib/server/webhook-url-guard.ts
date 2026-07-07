import { lookup } from 'dns/promises';
import { isIP } from 'net';

/**
 * Private / loopback / link-local / ULA / CGNAT + cloud-metadata ranges a paid-order webhook must
 * never reach — otherwise the be-BOP server is a blind-SSRF proxy into internal infrastructure
 * (an admin, or a compromised admin session on a multi-tenant SaaS, could point `apiRoute` at
 * `169.254.169.254`, `localhost`, or an internal service).
 */
export function isPrivateIp(ip: string): boolean {
	let addr = ip;
	if (addr.toLowerCase().startsWith('::ffff:')) {
		addr = addr.slice('::ffff:'.length); // IPv4-mapped IPv6 → treat as its v4 form
	}
	const kind = isIP(addr);
	if (kind === 4) {
		const [a, b] = addr.split('.').map(Number);
		return (
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 169 && b === 254) || // link-local + AWS/GCP/Azure metadata 169.254.169.254
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168) ||
			(a === 100 && b >= 64 && b <= 127) // CGNAT (RFC 6598)
		);
	}
	if (kind === 6) {
		const lower = addr.toLowerCase();
		return (
			lower === '::1' || // loopback
			lower === '::' ||
			lower.startsWith('fe80') || // link-local
			lower.startsWith('fc') || // unique-local
			lower.startsWith('fd')
		);
	}
	return false;
}

/**
 * Static, dependency-light checks (no DNS): protocol + literal-host. Returns a human-readable
 * reason when `rawUrl` is unusable as a webhook target, or `null` when it passes. Used at save
 * time for immediate admin feedback; DNS-resolved-IP checks run at fire time (see
 * {@link assertPublicWebhookTarget}) so a host that resolves public at save can't rebind to a
 * private address at fire time.
 */
export function webhookApiRouteIssue(rawUrl: string): string | null {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return 'Invalid URL';
	}
	if (url.protocol !== 'https:') {
		return 'Webhook URL must use https:// (the payload carries buyer PII)';
	}
	const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
		return 'Webhook URL must not target localhost or the internal network';
	}
	if (isIP(host) && isPrivateIp(host)) {
		return 'Webhook URL must not target a private, loopback or link-local address';
	}
	return null;
}

/**
 * Fire-time guard: re-runs the static checks, then resolves the hostname and rejects if any
 * resolved address is private — this is the layer that defeats DNS rebinding (public at save,
 * private at fire). Throws with the reason when unsafe.
 *
 * Note: a small TOCTOU window remains between this lookup and `fetch`'s own resolution; combined
 * with `redirect: 'error'` on the fetch it closes the practical blind-SSRF paths for a PoC.
 * Pinning the resolved IP at connect time would remove the window entirely.
 */
export async function assertPublicWebhookTarget(rawUrl: string): Promise<void> {
	const issue = webhookApiRouteIssue(rawUrl);
	if (issue) {
		throw new Error(issue);
	}
	const host = new URL(rawUrl).hostname.replace(/^\[|\]$/g, '');
	if (isIP(host)) {
		return; // literal IP already vetted by webhookApiRouteIssue
	}
	const resolved = await lookup(host, { all: true });
	for (const { address } of resolved) {
		if (isPrivateIp(address)) {
			throw new Error(`Webhook host ${host} resolves to a private address (${address})`);
		}
	}
}
