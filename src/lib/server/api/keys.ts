import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import type { ApiKey, ApiKeyEnvironment } from '$lib/types/ApiKey';
import { API_V1_SCOPES, type ApiV1Scope } from '$lib/types/ApiV1';
import {
	apiKeyPrefixFromSecret,
	generateApiKeySecret,
	hashApiKeySecret,
	parseApiKeySecret
} from './key-crypto';

export {
	apiKeyPrefixFromSecret,
	generateApiKeySecret,
	hashApiKeySecret,
	parseApiKeySecret,
	timingSafeEqualHex
} from './key-crypto';

function assertScopes(scopes: ApiV1Scope[]) {
	for (const scope of scopes) {
		if (!API_V1_SCOPES.includes(scope)) {
			throw new Error(`Unknown API scope: ${scope}`);
		}
	}
	if (!scopes.length) {
		throw new Error('At least one scope is required');
	}
}

export async function createApiKey(opts: {
	name: string;
	scopes: ApiV1Scope[];
	environment?: ApiKeyEnvironment;
	expiresAt?: Date;
	createdBy?: string;
}): Promise<{ apiKey: ApiKey; secret: string }> {
	const environment = opts.environment ?? 'live';
	assertScopes(opts.scopes);
	const secret = generateApiKeySecret(environment);
	const now = new Date();
	const apiKey: ApiKey = {
		_id: new ObjectId(),
		name: opts.name.trim(),
		keyHash: hashApiKeySecret(secret),
		keyPrefix: apiKeyPrefixFromSecret(secret),
		scopes: [...opts.scopes],
		environment,
		expiresAt: opts.expiresAt,
		createdBy: opts.createdBy,
		createdAt: now,
		updatedAt: now
	};
	await collections.apiKeys.insertOne(apiKey);
	return { apiKey, secret };
}

export async function findApiKeyBySecret(secret: string): Promise<ApiKey | null> {
	const parsed = parseApiKeySecret(secret);
	if (!parsed.validFormat) {
		return null;
	}
	const keyHash = hashApiKeySecret(secret);
	return collections.apiKeys.findOne({ keyHash });
}

export function isApiKeyUsable(apiKey: ApiKey, at = new Date()): boolean {
	if (apiKey.revokedAt && apiKey.revokedAt <= at) {
		return false;
	}
	if (apiKey.expiresAt && apiKey.expiresAt <= at) {
		return false;
	}
	return true;
}

export function apiKeyHasScope(apiKey: ApiKey, scope: ApiV1Scope): boolean {
	return apiKey.scopes.includes(scope);
}

export async function revokeApiKey(id: ObjectId | string): Promise<ApiKey | null> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	const now = new Date();
	const result = await collections.apiKeys.findOneAndUpdate(
		{ _id, revokedAt: { $exists: false } },
		{ $set: { revokedAt: now, updatedAt: now } },
		{ returnDocument: 'after' }
	);
	return result.value;
}

export async function touchApiKey(id: ObjectId, at = new Date()): Promise<void> {
	await collections.apiKeys.updateOne({ _id: id }, { $set: { lastUsedAt: at, updatedAt: at } });
}

/** Fields safe to send to the admin UI — never includes keyHash. */
export type ApiKeyPublic = Omit<ApiKey, 'keyHash'>;

const API_KEY_PUBLIC_PROJECTION = {
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
} as const;

/** Projection used by list/detail — tested so keyHash cannot leak to clients. */
export function apiKeyPublicProjection(): typeof API_KEY_PUBLIC_PROJECTION {
	return API_KEY_PUBLIC_PROJECTION;
}

export async function listApiKeys(): Promise<ApiKeyPublic[]> {
	return collections.apiKeys
		.find({})
		.project<ApiKeyPublic>(API_KEY_PUBLIC_PROJECTION)
		.sort({ createdAt: -1 })
		.toArray();
}

export async function getApiKeyPublic(id: ObjectId | string): Promise<ApiKeyPublic | null> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	return collections.apiKeys.findOne<ApiKeyPublic>(
		{ _id },
		{ projection: API_KEY_PUBLIC_PROJECTION }
	);
}

export function serializeApiKeyPublic(k: ApiKeyPublic) {
	return {
		_id: k._id.toString(),
		name: k.name,
		keyPrefix: k.keyPrefix,
		scopes: k.scopes,
		environment: k.environment,
		expiresAt: k.expiresAt ?? null,
		revokedAt: k.revokedAt ?? null,
		lastUsedAt: k.lastUsedAt ?? null,
		createdBy: k.createdBy ?? null,
		createdAt: k.createdAt,
		updatedAt: k.updatedAt
	};
}
