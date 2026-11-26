import { describe, expect, it } from 'vitest';
import { countHit, isRateLimited, rateLimit } from './rateLimit';

const minute = { minutes: 1 };

// The cache outlives each test, so every test counts on its own key.
let keyCount = 0;
const freshKey = () => `test-${++keyCount}`;

function hitUntilLimited(ip: string | undefined, key: string, max: number, attempts: number) {
	for (let i = 0; i < attempts; i++) {
		try {
			rateLimit(ip, key, max, minute);
		} catch (err) {
			expect(err).toMatchObject({ status: 429 });
			return i;
		}
	}
	return null;
}

describe('rateLimit', () => {
	it('never limits a caller whose address could not be read', () => {
		const key = freshKey();

		expect(hitUntilLimited(undefined, key, 30, 100)).toBeNull();
		expect(hitUntilLimited('', key, 30, 100)).toBeNull();
	});

	it('answers 429 once an address goes past the limit', () => {
		expect(hitUntilLimited('203.0.113.1', freshKey(), 30, 100)).toBe(30);
	});

	it('counts each address on its own', () => {
		const key = freshKey();

		expect(hitUntilLimited('203.0.113.2', key, 3, 10)).toBe(3);
		expect(hitUntilLimited('203.0.113.3', key, 3, 10)).toBe(3);
	});

	it('counts two IPv6 addresses of the same /64 as one caller', () => {
		const key = freshKey();

		expect(hitUntilLimited('2001:db8:1:2::1', key, 3, 2)).toBeNull();
		expect(hitUntilLimited('2001:db8:1:2:ffff::9', key, 3, 10)).toBe(1);
		expect(hitUntilLimited('2001:db8:1:3::1', key, 3, 10)).toBe(3);
	});
});

describe('isRateLimited and countHit', () => {
	it('limit an address once it reached the limit', () => {
		const key = freshKey();

		for (let i = 0; i < 3; i++) {
			expect(isRateLimited('203.0.113.4', key, 3, minute)).toBe(false);
			countHit('203.0.113.4', key, minute);
		}
		expect(isRateLimited('203.0.113.4', key, 3, minute)).toBe(true);
	});

	it('never count nor limit a caller whose address could not be read', () => {
		const key = freshKey();

		for (let i = 0; i < 100; i++) {
			countHit(undefined, key, minute);
			countHit('', key, minute);
		}
		expect(isRateLimited(undefined, key, 1, minute)).toBe(false);
		expect(isRateLimited('', key, 1, minute)).toBe(false);
	});
});
