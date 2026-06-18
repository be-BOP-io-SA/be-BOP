/**
 * Implements a rate limiter for the API at application level.
 *
 * This doesn't handle multiple processes, if you plan to deploy at scale put a CDN in front of the API.
 *
 * (or contribute a better solution!)
 */

import { error } from '@sveltejs/kit';
import { type Duration, sub } from 'date-fns';
import ipModule from 'ip';
import { isIPv6 } from 'node:net';
import { processClosed } from './process';

const rateLimitCache = new Map<string, Record<string, Date[]>>();

/**
 * Note that rate limiting cache is cleared every hour and not persisted across deploys.
 */
export function rateLimit(
	ip: string | undefined,
	key: string,
	max: number,
	duration: Duration
): void {
	if (!ip) {
		return;
	}
	const maskedIp = isIPv6(ip)
		? // Mask the last 64 bits of the IPv6 address
		  ipModule.mask(ip, 'ffff:ffff:ffff:ffff:0000:0000:0000:0000')
		: ip;

	const minDate = sub(new Date(), duration);
	const ipCache = rateLimitCache.get(maskedIp) ?? {};

	if (!ipCache[key]) {
		ipCache[key] = [];
	}

	while (ipCache[key].length && ipCache[key][0] < minDate) {
		ipCache[key].shift();
	}

	if (ipCache[key].length >= max) {
		throw error(429, 'Too many requests, wait a few minutes before trying again.');
	}

	ipCache[key].push(new Date());

	rateLimitCache.set(maskedIp, ipCache);
}

// Clear the cache every hour
const interval = setInterval(
	() => {
		rateLimitCache.clear();
		if (processClosed) {
			clearInterval(interval);
		}
	},
	3600_000 // 1 hour
);
