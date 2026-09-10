import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, rateLimit } from './rateLimit';

describe('rateLimit generic bucket', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('allows up to max events then throws', () => {
		const bucket = 'api-key-' + Math.random().toString(16).slice(2);
		const key = 'test.' + Math.random().toString(16).slice(2);
		expect(() => rateLimit(bucket, key, 2, { minutes: 1 })).not.toThrow();
		expect(() => rateLimit(bucket, key, 2, { minutes: 1 })).not.toThrow();
		expect(() => rateLimit(bucket, key, 2, { minutes: 1 })).toThrow();
	});

	it('ignores undefined bucket ids (legacy IP behaviour)', () => {
		expect(() => rateLimit(undefined, 'noop', 1, { minutes: 1 })).not.toThrow();
		expect(checkRateLimit(undefined, 'noop', 1, { minutes: 1 })).toEqual({ limited: false });
	});

	it('checkRateLimit returns ceil remaining seconds until window resets', () => {
		vi.useFakeTimers();
		const start = new Date('2026-08-12T12:00:00.000Z');
		vi.setSystemTime(start);

		const bucket = 'retry-bucket-' + Math.random().toString(16).slice(2);
		const key = 'retry.key.' + Math.random().toString(16).slice(2);

		expect(checkRateLimit(bucket, key, 1, { seconds: 30 })).toEqual({ limited: false });

		// 10.2s later → 19.8s remaining → ceil = 20
		vi.setSystemTime(new Date(start.getTime() + 10_200));
		expect(checkRateLimit(bucket, key, 1, { seconds: 30 })).toEqual({
			limited: true,
			retryAfterSeconds: 20
		});
	});

	it('checkRateLimit retryAfterSeconds is at least 1 when limited', () => {
		vi.useFakeTimers();
		const start = new Date('2026-08-12T12:00:00.000Z');
		vi.setSystemTime(start);

		const bucket = 'min-bucket-' + Math.random().toString(16).slice(2);
		const key = 'min.key.' + Math.random().toString(16).slice(2);

		expect(checkRateLimit(bucket, key, 1, { seconds: 2 })).toEqual({ limited: false });

		// Almost at reset (1ms left) → still limited with minimum 1 second
		vi.setSystemTime(new Date(start.getTime() + 1_999));
		expect(checkRateLimit(bucket, key, 1, { seconds: 2 })).toEqual({
			limited: true,
			retryAfterSeconds: 1
		});
	});
});
