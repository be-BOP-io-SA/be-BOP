import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import type { ApiKey } from '$lib/types/ApiKey';

const findApiKeyBySecret = vi.fn();
const touchApiKey = vi.fn().mockResolvedValue(undefined);

vi.mock('$lib/server/api/keys', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/api/keys')>(
		'$lib/server/api/keys'
	);
	return {
		...actual,
		findApiKeyBySecret: (...args: unknown[]) => findApiKeyBySecret(...args),
		touchApiKey: (...args: unknown[]) => touchApiKey(...args)
	};
});

import { authenticateApiV1, requireApiKey } from './auth';
import { hashApiKeySecret } from '../key-crypto';

function makeEvent(headers: Record<string, string>) {
	const locals: Record<string, unknown> = {};
	return {
		request: new Request('http://localhost/api/v1/orders', {
			method: 'POST',
			headers
		}),
		locals
	} as unknown as Parameters<typeof authenticateApiV1>[0];
}

const usableKey: ApiKey = {
	_id: new ObjectId(),
	name: 'test',
	keyHash: 'a'.repeat(64),
	keyPrefix: 'bebop_ak_test_abcd1234',
	scopes: ['orders:write'],
	environment: 'test',
	createdAt: new Date(),
	updatedAt: new Date()
};

async function expectUnauthorized(res: Response | null) {
	expect(res).not.toBeNull();
	expect(res?.status).toBe(401);
	if (!res) {
		throw new Error('expected error response');
	}
	await expect(res.json()).resolves.toMatchObject({
		error: { code: 'UNAUTHORIZED' }
	});
}

describe('authenticateApiV1', () => {
	beforeEach(() => {
		findApiKeyBySecret.mockReset();
		touchApiKey.mockClear();
	});

	it('rejects missing credentials', async () => {
		const event = makeEvent({});
		const res = await authenticateApiV1(event, 'orders:write');
		await expectUnauthorized(res);
	});

	it('rejects malformed Bearer (no token)', async () => {
		const event = makeEvent({ authorization: 'Bearer' });
		const res = await authenticateApiV1(event, 'orders:write');
		await expectUnauthorized(res);
		expect(findApiKeyBySecret).not.toHaveBeenCalled();
	});

	it('rejects malformed Bearer (Basic scheme / extra tokens)', async () => {
		expect(
			(await authenticateApiV1(makeEvent({ authorization: 'Basic abc' }), 'orders:write'))?.status
		).toBe(401);
		expect(
			(await authenticateApiV1(makeEvent({ authorization: 'Bearer tok extra' }), 'orders:write'))
				?.status
		).toBe(401);
		expect(findApiKeyBySecret).not.toHaveBeenCalled();
	});

	it('rejects empty / whitespace-only X-Api-Key when no Bearer', async () => {
		const res = await authenticateApiV1(makeEvent({ 'x-api-key': '   ' }), 'orders:write');
		await expectUnauthorized(res);
		expect(findApiKeyBySecret).not.toHaveBeenCalled();
	});

	it('accepts Authorization Bearer and sets locals.apiKey', async () => {
		findApiKeyBySecret.mockResolvedValue(usableKey);
		const event = makeEvent({ authorization: 'Bearer bebop_ak_test_secret' });
		const res = await authenticateApiV1(event, 'orders:write');
		expect(res).toBeNull();
		expect(event.locals.apiKey?.keyPrefix).toBe(usableKey.keyPrefix);
		expect(touchApiKey).toHaveBeenCalled();
	});

	it('accepts X-Api-Key header', async () => {
		findApiKeyBySecret.mockResolvedValue(usableKey);
		const event = makeEvent({ 'x-api-key': 'bebop_ak_test_secret' });
		const res = await authenticateApiV1(event, 'orders:write');
		expect(res).toBeNull();
	});

	it('prefers X-Api-Key over Authorization when both present', async () => {
		findApiKeyBySecret.mockResolvedValue(usableKey);
		const event = makeEvent({
			'x-api-key': 'bebop_ak_test_from_header',
			authorization: 'Bearer bebop_ak_test_from_bearer'
		});
		await authenticateApiV1(event, 'orders:write');
		expect(findApiKeyBySecret).toHaveBeenCalledWith('bebop_ak_test_from_header');
	});

	it('rejects keys without required scope', async () => {
		findApiKeyBySecret.mockResolvedValue({
			...usableKey,
			scopes: []
		});
		const event = makeEvent({ 'x-api-key': 'bebop_ak_test_secret' });
		const res = await authenticateApiV1(event, 'orders:write');
		expect(res).not.toBeNull();
		expect(res?.status).toBe(403);
		if (!res) {
			throw new Error('expected error response');
		}
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'FORBIDDEN' }
		});
		expect(touchApiKey).not.toHaveBeenCalled();
	});

	it('rejects unknown keys (hash miss)', async () => {
		findApiKeyBySecret.mockResolvedValue(null);
		const event = makeEvent({ 'x-api-key': 'bebop_ak_test_secret' });
		const res = await authenticateApiV1(event, 'orders:write');
		await expectUnauthorized(res);
		// Distinct secrets produce distinct digests under SHA-256(secret).
		expect(hashApiKeySecret('bebop_ak_test_secret')).not.toBe(
			hashApiKeySecret('bebop_ak_test_other')
		);
	});

	it('rejects revoked (disabled) keys', async () => {
		findApiKeyBySecret.mockResolvedValue({
			...usableKey,
			revokedAt: new Date(Date.now() - 1000)
		});
		const res = await authenticateApiV1(
			makeEvent({ 'x-api-key': 'bebop_ak_test_secret' }),
			'orders:write'
		);
		await expectUnauthorized(res);
		expect(touchApiKey).not.toHaveBeenCalled();
	});

	it('rejects expired keys', async () => {
		findApiKeyBySecret.mockResolvedValue({
			...usableKey,
			expiresAt: new Date(Date.now() - 1000)
		});
		const res = await authenticateApiV1(
			makeEvent({ 'x-api-key': 'bebop_ak_test_secret' }),
			'orders:write'
		);
		await expectUnauthorized(res);
		expect(touchApiKey).not.toHaveBeenCalled();
	});

	it('rejects oversized API key secret before hashing (≤256)', async () => {
		const huge = 'x'.repeat(257);
		const res = await authenticateApiV1(makeEvent({ 'x-api-key': huge }), 'orders:write');
		await expectUnauthorized(res);
		expect(findApiKeyBySecret).not.toHaveBeenCalled();
	});

	it('accepts not-yet-expired keys', async () => {
		findApiKeyBySecret.mockResolvedValue({
			...usableKey,
			expiresAt: new Date(Date.now() + 60_000)
		});
		const res = await authenticateApiV1(
			makeEvent({ 'x-api-key': 'bebop_ak_test_secret' }),
			'orders:write'
		);
		expect(res).toBeNull();
	});
});

describe('requireApiKey', () => {
	beforeEach(() => {
		findApiKeyBySecret.mockReset();
		touchApiKey.mockClear();
	});

	it('returns AuthenticatedApiKey on success', async () => {
		findApiKeyBySecret.mockResolvedValue(usableKey);
		const event = makeEvent({ 'x-api-key': 'bebop_ak_test_secret' });
		const result = await requireApiKey(event, 'orders:write');
		expect(result).not.toBeInstanceOf(Response);
		expect((result as { keyPrefix: string }).keyPrefix).toBe(usableKey.keyPrefix);
	});

	it('returns Response on auth failure', async () => {
		findApiKeyBySecret.mockResolvedValue(null);
		const event = makeEvent({ 'x-api-key': 'bad' });
		const result = await requireApiKey(event, 'orders:write');
		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
	});
});
