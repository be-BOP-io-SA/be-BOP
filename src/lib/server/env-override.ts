/**
 * Boot-time env override discovery.
 *
 * When `ALLOW_ENV_OVERRIDE=true`, opens a short-lived MongoDB connection to the
 * bootstrap DB (the one in `MONGODB_URL` at deploy time), reads the merchant's
 * S3 config (from env vars or `runtimeConfig.s3`), looks for an override file
 * in their bucket, validates it, and — if a connection to the override target
 * succeeds — mutates `process.env` so that `database.ts` connects to the
 * override target instead.
 *
 * This module is imported as the very first line of `hooks.server.ts` so that
 * it runs (via top-level await) before any other server module captures
 * MONGODB_URL.
 *
 * Failure modes write a marker in S3 (`_bebop/override.failed`) and set a flag
 * in the bootstrap DB's runtimeConfig (`envOverrideFailed`). The marker
 * prevents endless retry loops; the flag lets the admin UI surface a warning.
 * Both are cleared by the Save / Delete actions on `/admin/be-bop`.
 */

import { building } from '$app/environment';
import { MongoClient } from 'mongodb';
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	HeadObjectCommand
} from '@aws-sdk/client-s3';

export const OVERRIDE_FILE_KEY = '_bebop/override.env';
export const FAILED_MARKER_KEY = '_bebop/override.failed';
export const FALLBACK_FLAG_ID = 'envOverrideFailed';

export const OVERRIDE_ALLOWED_KEYS = [
	'MONGODB_URL',
	'MONGODB_DB',
	'MONGODB_DIRECT_CONNECTION',
	'MONGODB_IP_FAMILY'
] as const;

const allowedKeySet = new Set<string>(OVERRIDE_ALLOWED_KEYS);

interface S3Config {
	bucket: string;
	endpointUrl: string;
	region: string;
	keyId: string;
	keySecret: string;
}

interface RuntimeConfigDoc {
	_id: string;
	data: unknown;
	updatedAt?: Date;
}

function isFlagOn(): boolean {
	const v = process.env.ALLOW_ENV_OVERRIDE;
	return v === 'true' || v === '1';
}

function effectiveS3FromEnv(): S3Config | null {
	const bucket = process.env.S3_BUCKET;
	const keyId = process.env.S3_KEY_ID;
	const keySecret = process.env.S3_KEY_SECRET;
	if (!bucket || !keyId || !keySecret) {
		return null;
	}
	return {
		bucket,
		endpointUrl: process.env.S3_ENDPOINT_URL ?? '',
		region: process.env.S3_REGION ?? 'us-east-1',
		keyId,
		keySecret
	};
}

async function s3ConfigFromMongo(client: MongoClient): Promise<S3Config | null> {
	const dbName = process.env.MONGODB_DB || 'bebop';
	const doc = await client
		.db(dbName)
		.collection<RuntimeConfigDoc>('runtimeConfig')
		.findOne({ _id: 's3' });
	const data = doc?.data as Partial<S3Config> | undefined;
	if (!data?.bucket || !data?.keyId || !data?.keySecret) {
		return null;
	}
	return {
		bucket: data.bucket,
		endpointUrl: data.endpointUrl ?? '',
		region: data.region ?? 'us-east-1',
		keyId: data.keyId,
		keySecret: data.keySecret
	};
}

function makeS3Client(cfg: S3Config): S3Client {
	return new S3Client({
		endpoint: cfg.endpointUrl || undefined,
		region: cfg.region,
		credentials: { accessKeyId: cfg.keyId, secretAccessKey: cfg.keySecret },
		forcePathStyle: true
	});
}

async function markerExists(s3: S3Client, bucket: string): Promise<boolean> {
	try {
		await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: FAILED_MARKER_KEY }));
		return true;
	} catch {
		return false;
	}
}

async function readOverrideFile(s3: S3Client, bucket: string): Promise<string | null> {
	try {
		const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: OVERRIDE_FILE_KEY }));
		if (!out.Body) {
			return null;
		}
		return await out.Body.transformToString();
	} catch {
		return null;
	}
}

function parseOverride(content: string): Record<string, string> {
	const result: Record<string, string> = {};
	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) {
			continue;
		}
		const eqIdx = line.indexOf('=');
		if (eqIdx <= 0) {
			continue;
		}
		const key = line.slice(0, eqIdx).trim();
		let value = line.slice(eqIdx + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		// Silent ignore of out-of-whitelist keys: defense in depth against a manual S3 edit
		if (allowedKeySet.has(key)) {
			result[key] = value;
		}
	}
	return result;
}

async function testTargetMongo(
	env: Record<string, string>
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const url = env.MONGODB_URL;
	if (!url) {
		return { ok: false, reason: 'override is missing MONGODB_URL' };
	}
	const directConnection = env.MONGODB_DIRECT_CONNECTION === 'true';
	const family = env.MONGODB_IP_FAMILY === '4' ? 4 : env.MONGODB_IP_FAMILY === '6' ? 6 : undefined;
	const dbName = env.MONGODB_DB || process.env.MONGODB_DB || 'bebop';
	const client = new MongoClient(url, {
		directConnection,
		...(family ? { family } : {}),
		serverSelectionTimeoutMS: 10_000,
		connectTimeoutMS: 10_000
	});
	try {
		await client.connect();
		await client.db(dbName).command({ ping: 1 });
		return { ok: true };
	} catch (err) {
		return { ok: false, reason: err instanceof Error ? err.message : String(err) };
	} finally {
		await client.close().catch(() => {});
	}
}

async function writeFailedFlag(client: MongoClient, reason: string): Promise<void> {
	const dbName = process.env.MONGODB_DB || 'bebop';
	await client
		.db(dbName)
		.collection<RuntimeConfigDoc>('runtimeConfig')
		.updateOne(
			{ _id: FALLBACK_FLAG_ID },
			{ $set: { data: { at: new Date(), reason }, updatedAt: new Date() } },
			{ upsert: true }
		);
}

async function writeMarker(s3: S3Client, bucket: string, reason: string): Promise<void> {
	await s3.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: FAILED_MARKER_KEY,
			Body: JSON.stringify({ at: new Date().toISOString(), reason }),
			ContentType: 'application/json'
		})
	);
}

async function applyEnvOverride(): Promise<void> {
	if (building) {
		return;
	}
	if (process.env.VITEST) {
		return;
	}
	if (!isFlagOn()) {
		return;
	}

	const localUrl = process.env.MONGODB_URL;
	if (!localUrl) {
		console.warn('[env-override] MONGODB_URL not set, skipping');
		return;
	}

	const localClient = new MongoClient(localUrl, {
		serverSelectionTimeoutMS: 10_000,
		connectTimeoutMS: 10_000
	});
	try {
		await localClient.connect();
	} catch (err) {
		console.error(
			'[env-override] cannot connect to bootstrap Mongo for discovery, skipping override',
			err
		);
		await localClient.close().catch(() => {});
		return;
	}

	try {
		const s3Cfg = effectiveS3FromEnv() ?? (await s3ConfigFromMongo(localClient));
		if (!s3Cfg) {
			console.log('[env-override] S3 not configured, skipping override');
			return;
		}

		const s3 = makeS3Client(s3Cfg);

		if (await markerExists(s3, s3Cfg.bucket)) {
			console.warn(
				'[env-override] failed marker present in S3, skipping override until admin clears it'
			);
			return;
		}

		const content = await readOverrideFile(s3, s3Cfg.bucket);
		if (!content) {
			console.log('[env-override] no override file in S3, continuing without');
			return;
		}

		const overrides = parseOverride(content);
		if (Object.keys(overrides).length === 0) {
			console.log('[env-override] override file contained no whitelisted keys, skipping');
			return;
		}

		const test = await testTargetMongo(overrides);
		if (!test.ok) {
			console.error('[env-override] override target validation failed:', test.reason);
			try {
				await writeMarker(s3, s3Cfg.bucket, test.reason);
				await writeFailedFlag(localClient, test.reason);
			} catch (err2) {
				console.error('[env-override] could not record failure marker/flag:', err2);
			}
			return;
		}

		for (const [k, v] of Object.entries(overrides)) {
			process.env[k] = v;
		}
		console.log(`[env-override] applied ${Object.keys(overrides).length} env var override(s)`);
	} catch (err) {
		console.error('[env-override] unexpected error during boot discovery, skipping override:', err);
	} finally {
		await localClient.close().catch(() => {});
	}
}

await applyEnvOverride();
