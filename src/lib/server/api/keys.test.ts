import { describe, expect, it } from 'vitest';
import {
	apiKeyPrefixFromSecret,
	generateApiKeySecret,
	hashApiKeySecret,
	parseApiKeySecret,
	timingSafeEqualHex
} from './key-crypto';
import { apiKeyPublicProjection, isApiKeyUsable } from './keys';
import { ObjectId } from 'mongodb';
import type { ApiKey } from '$lib/types/ApiKey';

describe('api key helpers', () => {
	it('generates secrets in bebop_ak_{env}_{base64url} form', () => {
		const secret = generateApiKeySecret('live');
		expect(secret.startsWith('bebop_ak_live_')).toBe(true);
		const parsed = parseApiKeySecret(secret);
		expect(parsed.validFormat).toBe(true);
		if (parsed.validFormat) {
			expect(parsed.environment).toBe('live');
		}
	});

	it('hashes deterministically with SHA-256 of the secret alone', () => {
		const a = hashApiKeySecret('bebop_ak_test_abc');
		const b = hashApiKeySecret('bebop_ak_test_abc');
		const c = hashApiKeySecret('bebop_ak_test_other');
		expect(a).toBe(b);
		expect(a).not.toBe(c);
		expect(a).toMatch(/^[a-f0-9]{64}$/);
	});

	it('timingSafeEqualHex distinguishes unequal digests', () => {
		const h = hashApiKeySecret('x');
		expect(timingSafeEqualHex(h, h)).toBe(true);
		expect(timingSafeEqualHex(h, '0'.repeat(64))).toBe(false);
		expect(timingSafeEqualHex(h, 'short')).toBe(false);
	});

	it('builds a stable non-secret prefix', () => {
		const secret = 'bebop_ak_live_abcdefghijklmnop';
		expect(apiKeyPrefixFromSecret(secret)).toBe('bebop_ak_live_abcdefgh');
	});

	it('rejects malformed secrets without inventing an environment', () => {
		expect(parseApiKeySecret('not-a-key')).toEqual({ validFormat: false });
		expect(parseApiKeySecret('bebop_ak_prod_xxx')).toEqual({ validFormat: false });
		expect(parseApiKeySecret('')).toEqual({ validFormat: false });
		expect(parseApiKeySecret('bebop_ak_live_')).toEqual({ validFormat: false });
		expect(parseApiKeySecret('bebop_ak_live')).toEqual({ validFormat: false });
		expect(parseApiKeySecret('bebop_ak_test_has space')).toEqual({ validFormat: false });
		expect(parseApiKeySecret('BEBOP_AK_LIVE_abc')).toEqual({ validFormat: false });
		// Must not invent { validFormat: true, environment: 'live' } for junk.
		for (const junk of ['live', 'bebop_ak_', 'ak_live_xxx', 'bebop_ak_staging_x']) {
			expect(parseApiKeySecret(junk)).toEqual({ validFormat: false });
		}
	});

	it('parses only live|test environments', () => {
		expect(parseApiKeySecret('bebop_ak_test_abc123')).toEqual({
			validFormat: true,
			environment: 'test'
		});
		expect(parseApiKeySecret('bebop_ak_live_abc123')).toEqual({
			validFormat: true,
			environment: 'live'
		});
	});

	it('isApiKeyUsable respects revoke and expiry', () => {
		const base: ApiKey = {
			_id: new ObjectId(),
			name: 't',
			keyHash: 'a'.repeat(64),
			keyPrefix: 'bebop_ak_test_abcd1234',
			scopes: ['orders:write'],
			environment: 'test',
			createdAt: new Date(),
			updatedAt: new Date()
		};
		expect(isApiKeyUsable(base)).toBe(true);
		expect(isApiKeyUsable({ ...base, revokedAt: new Date(Date.now() - 1000) })).toBe(false);
		expect(isApiKeyUsable({ ...base, expiresAt: new Date(Date.now() - 1000) })).toBe(false);
		expect(isApiKeyUsable({ ...base, expiresAt: new Date(Date.now() + 60_000) })).toBe(true);
		// Exactly-at boundary: expiresAt <= at → unusable
		const at = new Date('2026-01-01T00:00:00.000Z');
		expect(isApiKeyUsable({ ...base, expiresAt: at }, at)).toBe(false);
		expect(isApiKeyUsable({ ...base, revokedAt: at }, at)).toBe(false);
	});
});

describe('apiKeyPublicProjection', () => {
	it('never includes keyHash (thermos: secrets never in list JSON)', () => {
		const projection = apiKeyPublicProjection();
		expect(Object.prototype.hasOwnProperty.call(projection, 'keyHash')).toBe(false);
		expect('keyHash' in projection).toBe(false);
		expect(projection).toMatchObject({
			_id: 1,
			name: 1,
			keyPrefix: 1,
			scopes: 1,
			environment: 1,
			expiresAt: 1,
			revokedAt: 1,
			lastUsedAt: 1,
			createdBy: 1,
			createdAt: 1,
			updatedAt: 1
		});
	});
});
