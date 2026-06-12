/**
 * Pre-import shim used in production launch: `node --import ./env-override-preimport.mjs build/index.js`
 *
 * Runs BEFORE Node evaluates the SvelteKit bundle, which is the only reliable
 * way to mutate `process.env.MONGODB_URL` before `database.ts` captures it.
 * Doing the same work inside `hooks.server.ts` (the previous approach) is too
 * late: SvelteKit's manifest causes `database.ts` to evaluate before
 * `hooks.server.ts`, freezing the original MONGODB_URL.
 *
 * Requires Node 20+ (or 18.20+) for the --import flag.
 *
 * Gated by ALLOW_ENV_OVERRIDE. When the flag is off, this module is a near
 * no-op and adds negligible startup overhead.
 *
 * Constants below are duplicated from `src/lib/server/env-override.ts` (kept
 * for the admin UI's imports). Keep them in sync.
 */

import { MongoClient } from 'mongodb';
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	HeadObjectCommand
} from '@aws-sdk/client-s3';

const OVERRIDE_FILE_KEY = '_bebop/override.env';
const FAILED_MARKER_KEY = '_bebop/override.failed';
const FALLBACK_FLAG_ID = 'envOverrideFailed';

const OVERRIDE_ALLOWED_KEYS = new Set([
	'MONGODB_URL',
	'MONGODB_DB',
	'MONGODB_DIRECT_CONNECTION',
	'MONGODB_IP_FAMILY'
]);

function isFlagOn() {
	const v = process.env.ALLOW_ENV_OVERRIDE;
	return v === 'true' || v === '1';
}

function effectiveS3FromEnv() {
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

async function s3ConfigFromMongo(client) {
	const dbName = process.env.MONGODB_DB || 'bebop';
	const doc = await client.db(dbName).collection('runtimeConfig').findOne({ _id: 's3' });
	const data = doc?.data;
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

function makeS3Client(cfg) {
	return new S3Client({
		endpoint: cfg.endpointUrl || undefined,
		region: cfg.region,
		credentials: { accessKeyId: cfg.keyId, secretAccessKey: cfg.keySecret },
		forcePathStyle: true
	});
}

async function markerExists(s3, bucket) {
	try {
		await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: FAILED_MARKER_KEY }));
		return true;
	} catch {
		return false;
	}
}

async function readOverrideFile(s3, bucket) {
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

function parseOverride(content) {
	const result = {};
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
		if (OVERRIDE_ALLOWED_KEYS.has(key)) {
			result[key] = value;
		}
	}
	return result;
}

async function testTargetMongo(env) {
	const url = env.MONGODB_URL;
	if (!url) {
		return { ok: false, reason: 'override is missing MONGODB_URL' };
	}
	const directConnection = env.MONGODB_DIRECT_CONNECTION === 'true';
	const family =
		env.MONGODB_IP_FAMILY === '4' ? 4 : env.MONGODB_IP_FAMILY === '6' ? 6 : undefined;
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

async function writeFailedFlag(client, reason) {
	const dbName = process.env.MONGODB_DB || 'bebop';
	await client
		.db(dbName)
		.collection('runtimeConfig')
		.updateOne(
			{ _id: FALLBACK_FLAG_ID },
			{ $set: { data: { at: new Date(), reason }, updatedAt: new Date() } },
			{ upsert: true }
		);
}

async function writeMarker(s3, bucket, reason) {
	await s3.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: FAILED_MARKER_KEY,
			Body: JSON.stringify({ at: new Date().toISOString(), reason }),
			ContentType: 'application/json'
		})
	);
}

async function applyEnvOverride() {
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
		console.error(
			'[env-override] unexpected error during boot discovery, skipping override:',
			err
		);
	} finally {
		await localClient.close().catch(() => {});
	}
}

await applyEnvOverride();
