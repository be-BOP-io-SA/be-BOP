import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import type { ApiKey } from '$lib/types/ApiKey';
import { API_V1_SCOPES, type ApiV1Scope } from '$lib/types/ApiV1';
import {
	apiKeyPrefixFromSecret,
	generateApiKeySecret,
	hashApiKeySecret,
	parseApiKeySecret
} from './key-crypto';
import { apiKeySettingsShape, type ApiKeySettings } from './stream-settings';

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
	expiresAt?: Date;
	createdBy?: string;
	maxConcurrentStreams?: number | null;
	streamLifetimeSeconds?: number | null;
	ownOrdersOnly?: boolean;
	acceptDuplicateExternalOrderIds?: boolean;
	canDisableNotifications?: boolean;
}): Promise<{ apiKey: ApiKey; secret: string }> {
	assertScopes(opts.scopes);
	const secret = generateApiKeySecret();
	const now = new Date();
	const apiKey: ApiKey = {
		_id: new ObjectId(),
		name: opts.name.trim(),
		keyHash: hashApiKeySecret(secret),
		keyPrefix: apiKeyPrefixFromSecret(secret),
		scopes: [...opts.scopes],
		expiresAt: opts.expiresAt,
		createdBy: opts.createdBy,
		...(opts.maxConcurrentStreams && { maxConcurrentStreams: opts.maxConcurrentStreams }),
		...(opts.streamLifetimeSeconds && { streamLifetimeSeconds: opts.streamLifetimeSeconds }),
		...(opts.ownOrdersOnly && { ownOrdersOnly: true }),
		...(opts.acceptDuplicateExternalOrderIds && { acceptDuplicateExternalOrderIds: true }),
		...(opts.canDisableNotifications && { canDisableNotifications: true }),
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
	if (apiKey.suspendedAt) {
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

/**
 * Suspend a key, or reactivate it. Returns false when no key carries that id.
 *
 * Suspending is not revoking: nothing is deleted, and the key works again once reactivated.
 */
export async function setApiKeySuspended(
	id: ObjectId | string,
	suspended: boolean
): Promise<boolean> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	const now = new Date();
	// Matching on the current state: an already suspended key keeps the date it was suspended at.
	const result = suspended
		? await collections.apiKeys.updateOne(
				{ _id, suspendedAt: { $exists: false } },
				{ $set: { suspendedAt: now, updatedAt: now } }
		  )
		: await collections.apiKeys.updateOne(
				{ _id, suspendedAt: { $exists: true } },
				{ $unset: { suspendedAt: '' }, $set: { updatedAt: now } }
		  );
	if (result.matchedCount) {
		return true;
	}
	return (await collections.apiKeys.countDocuments({ _id }, { limit: 1 })) > 0;
}

/**
 * Write every setting of one key in a single update, so a save lands whole or not at all. Returns
 * whether the key's reach over orders changed, or null when no key carries that id.
 *
 * A setting left empty or switched off is stored as absent rather than as zero or false: "no
 * ceiling" and "a ceiling of zero" are opposite answers, and zero would refuse every stream.
 */
export async function updateApiKeySettings(
	id: ObjectId | string,
	settings: ApiKeySettings
): Promise<{ ownOrdersOnlyChanged: boolean } | null> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	const toSet: Record<string, unknown> = { updatedAt: new Date() };
	const toUnset: Record<string, ''> = {};
	for (const field of Object.keys(apiKeySettingsShape) as Array<keyof ApiKeySettings>) {
		const value = settings[field];
		if (value) {
			toSet[field] = value;
		} else {
			toUnset[field] = '';
		}
	}
	const before = await collections.apiKeys.findOneAndUpdate(
		{ _id },
		Object.keys(toUnset).length ? { $set: toSet, $unset: toUnset } : { $set: toSet },
		{ returnDocument: 'before', projection: { ownOrdersOnly: 1 } }
	);
	if (!before.value) {
		return null;
	}
	return { ownOrdersOnlyChanged: !!before.value.ownOrdersOnly !== settings.ownOrdersOnly };
}

export async function touchApiKey(id: ObjectId, at = new Date()): Promise<void> {
	await collections.apiKeys.updateOne({ _id: id }, { $set: { lastUsedAt: at, updatedAt: at } });
}

/**
 * Fields safe to send to the admin UI — never includes keyHash. The journal of doubtful calls is
 * read on its own, on the key's page only.
 */
export type ApiKeyPublic = Omit<ApiKey, 'keyHash' | 'suspiciousEvents'>;

const API_KEY_PUBLIC_PROJECTION = {
	_id: 1,
	name: 1,
	keyPrefix: 1,
	scopes: 1,
	maxConcurrentStreams: 1,
	streamLifetimeSeconds: 1,
	ownOrdersOnly: 1,
	acceptDuplicateExternalOrderIds: 1,
	canDisableNotifications: 1,
	expiresAt: 1,
	revokedAt: 1,
	suspendedAt: 1,
	suspiciousAt: 1,
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
		maxConcurrentStreams: k.maxConcurrentStreams ?? null,
		streamLifetimeSeconds: k.streamLifetimeSeconds ?? null,
		ownOrdersOnly: !!k.ownOrdersOnly,
		acceptDuplicateExternalOrderIds: !!k.acceptDuplicateExternalOrderIds,
		canDisableNotifications: !!k.canDisableNotifications,
		expiresAt: k.expiresAt ?? null,
		revokedAt: k.revokedAt ?? null,
		suspendedAt: k.suspendedAt ?? null,
		suspiciousAt: k.suspiciousAt ?? null,
		lastUsedAt: k.lastUsedAt ?? null,
		createdBy: k.createdBy ?? null,
		createdAt: k.createdAt,
		updatedAt: k.updatedAt
	};
}
