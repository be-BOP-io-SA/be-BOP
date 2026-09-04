/**
 * Implements a rate limiter for the API at application level.
 *
 * This doesn't handle multiple processes, if you plan to deploy at scale put a CDN in front of the API.
 *
 * (or contribute a better solution!)
 *
 * The first argument is a generic bucket id (IP, API key id, …). Legacy callers pass a client IP;
 * IPv6 addresses are still masked to a /64 for fair sharing.
 */

import { error } from '@sveltejs/kit';
import { add, type Duration, sub } from 'date-fns';
import ipModule from 'ip';
import { isIPv6 } from 'node:net';
import { processClosed } from './process';

const rateLimitCache = new Map<string, Record<string, Date[]>>();

export type RateLimitCheck = { limited: false } | { limited: true; retryAfterSeconds: number };

function normalizeBucketId(bucketId: string): string {
	try {
		if (isIPv6(bucketId)) {
			// Mask the last 64 bits of the IPv6 address
			return ipModule.mask(bucketId, 'ffff:ffff:ffff:ffff:0000:0000:0000:0000');
		}
	} catch {
		// not an IP — use as opaque bucket id (e.g. api key object id)
	}
	return bucketId;
}

/**
 * Check (and record) a rate-limit hit for an arbitrary bucket id (IP, token, …).
 *
 * When limited, `retryAfterSeconds` is the ceil of remaining window time until the
 * oldest event ages out (minimum 1). Cache is cleared every hour and not persisted.
 */
export function checkRateLimit(
	bucketId: string | undefined,
	key: string,
	max: number,
	duration: Duration
): RateLimitCheck {
	if (!bucketId) {
		return { limited: false };
	}
	const normalized = normalizeBucketId(bucketId);

	const now = new Date();
	const minDate = sub(now, duration);
	const bucketCache = rateLimitCache.get(normalized) ?? {};

	if (!bucketCache[key]) {
		bucketCache[key] = [];
	}

	while (bucketCache[key].length && bucketCache[key][0] < minDate) {
		bucketCache[key].shift();
	}

	if (bucketCache[key].length >= max) {
		const oldest = bucketCache[key][0];
		const resetsAt = add(oldest, duration);
		const retryAfterSeconds = Math.max(1, Math.ceil((resetsAt.getTime() - now.getTime()) / 1000));
		return { limited: true, retryAfterSeconds };
	}

	bucketCache[key].push(now);

	rateLimitCache.set(normalized, bucketCache);
	return { limited: false };
}

/**
 * Rate-limit by an arbitrary bucket id (IP, token, …).
 * Throws SvelteKit HttpError 429 when limited (legacy callers).
 * Prefer `checkRateLimit` when you need `retryAfterSeconds` for Retry-After headers.
 */
export function rateLimit(
	bucketId: string | undefined,
	key: string,
	max: number,
	duration: Duration
) {
	const result = checkRateLimit(bucketId, key, max, duration);
	if (result.limited) {
		throw error(429, 'Too many requests, wait a few minutes before trying again.');
	}
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
