import { lookup } from 'dns/promises';
import { BlockList, isIP } from 'net';

/**
 * Private / loopback / link-local / ULA / CGNAT + cloud-metadata ranges a paid-order webhook must
 * never reach — otherwise the be-BOP server is a blind-SSRF proxy into internal infrastructure
 * (an admin, or a compromised admin session on a multi-tenant SaaS, could point `apiRoute` at
 * `169.254.169.254`, `localhost`, or an internal service).
 */
export function isPrivateIp(ip: string): boolean {
	const kind = isIP(ip);
	if (kind === 4) {
		return NON_PUBLIC.check(ip, 'ipv4');
	}
	if (kind === 6) {
		const embedded = embeddedIpv4(ip);
		return (
			NON_PUBLIC.check(ip, 'ipv6') || (embedded !== null && NON_PUBLIC.check(embedded, 'ipv4'))
		);
	}
	return false;
}

const NON_PUBLIC = new BlockList();
for (const [network, prefix] of [
	['0.0.0.0', 8],
	['10.0.0.0', 8],
	['100.64.0.0', 10], // CGNAT (RFC 6598)
	['127.0.0.0', 8],
	['169.254.0.0', 16], // link-local + AWS/GCP/Azure metadata 169.254.169.254
	['172.16.0.0', 12],
	['192.0.0.0', 24],
	['192.168.0.0', 16],
	['198.18.0.0', 15], // benchmarking, routed internally by some clouds
	['224.0.0.0', 4], // multicast
	['240.0.0.0', 4] // reserved, broadcast
] as const) {
	NON_PUBLIC.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
	['::', 128],
	['::1', 128],
	['fc00::', 7], // unique-local
	['fe80::', 10], // link-local
	['ff00::', 8] // multicast
] as const) {
	NON_PUBLIC.addSubnet(network, prefix, 'ipv6');
}

/**
 * The IPv4 address an IPv6 one carries and routes to, if any: mapped (`::ffff:a.b.c.d`),
 * compatible (`::a.b.c.d`), NAT64 (`64:ff9b::/96`) and 6to4 (`2002::/16`). Each reaches the v4
 * host, so `[::ffff:a9fe:a9fe]` is the metadata endpoint however it is spelled.
 */
function embeddedIpv4(ip: string): string | null {
	const hextets = expandIpv6(ip);
	if (!hextets) {
		return null;
	}
	const v4 = (high: number, low: number) =>
		[high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
	const zeroUpTo = (n: number) => hextets.slice(0, n).every((h) => h === 0);

	if (zeroUpTo(5) && (hextets[5] === 0xffff || hextets[5] === 0)) {
		return v4(hextets[6], hextets[7]);
	}
	if (hextets[0] === 0x64 && hextets[1] === 0xff9b && hextets.slice(2, 6).every((h) => h === 0)) {
		return v4(hextets[6], hextets[7]);
	}
	if (hextets[0] === 0x2002) {
		return v4(hextets[1], hextets[2]);
	}
	return null;
}

function expandIpv6(ip: string): number[] | null {
	let addr = ip.toLowerCase().split('%')[0];
	const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
	if (dotted) {
		const [a, b, c, d] = dotted[1].split('.').map(Number);
		addr =
			addr.slice(0, -dotted[1].length) +
			`${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
	}
	const [head, tail] = addr.split('::');
	const parse = (part: string | undefined) =>
		part ? part.split(':').map((h) => parseInt(h, 16)) : [];
	const high = parse(head);
	const low = parse(tail);
	const hextets =
		tail === undefined ? high : [...high, ...Array(8 - high.length - low.length).fill(0), ...low];
	return hextets.length === 8 && hextets.every((h) => h >= 0 && h <= 0xffff) ? hextets : null;
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
