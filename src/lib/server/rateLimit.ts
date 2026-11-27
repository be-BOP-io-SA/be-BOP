/**
 * Implements a rate limiter for the API at application level.
 *
 * This doesn't handle multiple processes, if you plan to deploy at scale put a CDN in front of the API.
 *
 * (or contribute a better solution!)
 *
 * The first argument is a bucket id: a client IP for most callers, or an opaque id (API key id, …).
 * IPv6 addresses are counted per /64; any other id is used as is.
 */

import { error } from '@sveltejs/kit';
import { add, type Duration, sub } from 'date-fns';
import { ipv6Prefix64 } from './utils/ip';
import { isIPv6 } from 'node:net';
import { processClosed } from './process';

const rateLimitCache = new Map<string, Record<string, Date[]>>();

export type RateLimitCheck = { limited: false } | { limited: true; retryAfterSeconds: number };

/**
 * Note that rate limiting cache is cleared every hour and not persisted across deploys.
 */
export function rateLimit(ip: string | undefined, key: string, max: number, duration: Duration) {
	if (isRateLimited(ip, key, max, duration)) {
		throw error(429, 'Too many requests, wait a few minutes before trying again.');
	}

	countHit(ip, key, duration);
}

/**
 * Checks and records one hit for a bucket id, without throwing.
 *
 * When limited, `retryAfterSeconds` is the time left until the oldest hit ages out (at least 1),
 * for a Retry-After header.
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

	const now = new Date();
	const hits = recentHits(bucketId, key, duration);

	if (hits.length >= max) {
		const resetsAt = add(hits[0], duration);
		const retryAfterSeconds = Math.max(1, Math.ceil((resetsAt.getTime() - now.getTime()) / 1000));
		return { limited: true, retryAfterSeconds };
	}

	hits.push(now);
	return { limited: false };
}

/** Whether `ip` already reached `max` hits on `key` within `duration`, without counting one. */
export function isRateLimited(
	ip: string | undefined,
	key: string,
	max: number,
	duration: Duration
): boolean {
	// Callers without a readable address can't be told apart: one shared limit would block them all.
	if (!ip) {
		return false;
	}

	return recentHits(ip, key, duration).length >= max;
}

/** Counts one hit, for a limit checked separately with `isRateLimited`. */
export function countHit(ip: string | undefined, key: string, duration: Duration) {
	if (!ip) {
		return;
	}

	recentHits(ip, key, duration).push(new Date());
}

function recentHits(ip: string, key: string, duration: Duration): Date[] {
	// One customer usually holds a whole /64, so the prefix is the caller, not the address.
	const maskedIp = isIPv6(ip) ? ipv6Prefix64(ip) : ip;

	const minDate = sub(new Date(), duration);
	const ipCache = rateLimitCache.get(maskedIp) ?? {};
	rateLimitCache.set(maskedIp, ipCache);

	const hits = (ipCache[key] ??= []);
	while (hits.length && hits[0] < minDate) {
		hits.shift();
	}

	return hits;
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
