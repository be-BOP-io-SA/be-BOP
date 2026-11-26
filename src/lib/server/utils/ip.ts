import { isIPv4, isIPv6 } from 'node:net';

/**
 * The address parsing be-BOP needs, on top of `node:net`.
 *
 * Replaces the `ip` package, which is unmaintained and carries an unfixable SSRF advisory
 * (CVE-2024-29415) in a function we never called. `node:net` validates; these expand.
 */

/** Groups of an IPv6 address, zone id dropped and any embedded IPv4 folded into two hextets. */
function hextets(ip: string): number[] {
	const address = ip.split('%')[0];

	// A trailing dotted quad (`::ffff:127.0.0.1`) stands for the last two groups.
	const dotted = address.lastIndexOf('.');
	const head =
		dotted === -1
			? address
			: (() => {
					const cut = address.lastIndexOf(':') + 1;
					const [a, b, c, d] = address.slice(cut).split('.').map(Number);
					return `${address.slice(0, cut)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(
						16
					)}`;
			  })();

	const [before, after] = head.split('::');
	const left = before ? before.split(':').map((g) => parseInt(g, 16)) : [];
	const right = after ? after.split(':').map((g) => parseInt(g, 16)) : [];

	// `::` stands for however many all-zero groups are needed to reach eight.
	return after === undefined
		? left
		: [...left, ...new Array(8 - left.length - right.length).fill(0), ...right];
}

/** An address as its raw bytes: 4 for IPv4, 16 for IPv6. Throws on anything else. */
export function ipToBuffer(ip: string): Buffer {
	if (isIPv4(ip)) {
		return Buffer.from(ip.split('.').map(Number));
	}

	if (!isIPv6(ip)) {
		throw new TypeError(`Not an IP address: ${ip}`);
	}

	const buffer = Buffer.alloc(16);
	hextets(ip).forEach((group, i) => buffer.writeUInt16BE(group, i * 2));

	return buffer;
}

/**
 * The /64 an IPv6 address sits in, as a stable key.
 *
 * A single customer is routinely handed a whole /64, so rate limiting counts the prefix
 * rather than the address — otherwise one caller gets as many budgets as it has addresses.
 */
export function ipv6Prefix64(ip: string): string {
	return hextets(ip)
		.slice(0, 4)
		.map((group) => group.toString(16).padStart(4, '0'))
		.join(':');
}
