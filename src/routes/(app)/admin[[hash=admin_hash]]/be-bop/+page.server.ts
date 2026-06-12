import { ALLOW_ENV_OVERRIDE } from '$lib/server/env-config';
import { collections } from '$lib/server/database';
import { getS3Client } from '$lib/server/s3';
import { runtimeConfig } from '$lib/server/runtime-config';
import {
	OVERRIDE_ALLOWED_KEYS,
	OVERRIDE_FILE_KEY,
	FAILED_MARKER_KEY,
	FALLBACK_FLAG_ID
} from '$lib/server/env-override';
import {
	EXIT_RESTART,
	EXIT_UPDATE_LATEST,
	ROLLBACK_MAX_STEP,
	rollbackExitCode
} from '$lib/server/exit-codes';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { error, type Actions, type RequestEvent } from '@sveltejs/kit';
import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';

const FLAG_ENABLED = ALLOW_ENV_OVERRIDE === 'true' || ALLOW_ENV_OVERRIDE === '1';

function guardOrThrow(locals: App.Locals): void {
	if (!FLAG_ENABLED) {
		throw error(404);
	}
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page!');
	}
}

function s3Configured(): boolean {
	return !!(runtimeConfig.s3.bucket && runtimeConfig.s3.keyId && runtimeConfig.s3.keySecret);
}

async function overrideFileExists(): Promise<boolean> {
	if (!s3Configured()) {
		return false;
	}
	try {
		await getS3Client().send(
			new HeadObjectCommand({ Bucket: runtimeConfig.s3.bucket, Key: OVERRIDE_FILE_KEY })
		);
		return true;
	} catch {
		return false;
	}
}

async function deleteIfExists(key: string): Promise<void> {
	if (!s3Configured()) {
		return;
	}
	try {
		await getS3Client().send(
			new DeleteObjectCommand({ Bucket: runtimeConfig.s3.bucket, Key: key })
		);
	} catch {
		// idempotent: ignore "not found" and similar
	}
}

async function clearFailedFlag(): Promise<void> {
	await collections.runtimeConfig.updateOne(
		{ _id: FALLBACK_FLAG_ID },
		{ $set: { data: null, updatedAt: new Date() } },
		{ upsert: true }
	);
	runtimeConfig.envOverrideFailed = null;
}

export async function load({ locals }) {
	guardOrThrow(locals);
	return {
		s3Configured: s3Configured(),
		overrideFileExists: await overrideFileExists(),
		failedFlag: runtimeConfig.envOverrideFailed,
		allowedKeys: [...OVERRIDE_ALLOWED_KEYS] as string[],
		rollbackMaxStep: ROLLBACK_MAX_STEP
	};
}

// Schedule the actual process exit so that the SvelteKit response can be sent first.
function scheduleExit(code: number): void {
	setTimeout(() => process.exit(code), 250);
}

export const actions: Actions = {
	save: async ({ request, locals }: RequestEvent) => {
		guardOrThrow(locals);
		if (!s3Configured()) {
			throw error(400, 'S3 must be configured before uploading an override file.');
		}
		const formData = await request.formData();
		const file = formData.get('override');
		if (!(file instanceof File) || file.size === 0) {
			throw error(400, 'No file provided.');
		}
		if (file.size > 64 * 1024) {
			throw error(400, 'Override file is too large (max 64KB).');
		}
		const text = await file.text();

		// Validate: every non-empty, non-comment line must be a whitelisted KEY=VALUE.
		const allowed = new Set<string>(OVERRIDE_ALLOWED_KEYS);
		const seenKeys: string[] = [];
		for (const rawLine of text.split('\n')) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) {
				continue;
			}
			const eqIdx = line.indexOf('=');
			if (eqIdx <= 0) {
				throw error(400, `Invalid line (expected KEY=VALUE): ${line.slice(0, 60)}`);
			}
			const key = line.slice(0, eqIdx).trim();
			if (!allowed.has(key)) {
				throw error(400, `Key "${key}" is not allowed. Allowed keys: ${[...allowed].join(', ')}`);
			}
			seenKeys.push(key);
		}
		if (seenKeys.length === 0) {
			throw error(400, 'Override file contains no key.');
		}

		await getS3Client().send(
			new PutObjectCommand({
				Bucket: runtimeConfig.s3.bucket,
				Key: OVERRIDE_FILE_KEY,
				Body: text,
				ContentType: 'text/plain'
			})
		);

		// A new override deserves a fresh attempt — clear any prior failure state.
		await deleteIfExists(FAILED_MARKER_KEY);
		await clearFailedFlag();

		return { success: true, message: `Override file saved (${seenKeys.length} key(s)).` };
	},

	delete: async ({ locals }: RequestEvent) => {
		guardOrThrow(locals);
		if (!s3Configured()) {
			throw error(400, 'S3 is not configured.');
		}
		await deleteIfExists(OVERRIDE_FILE_KEY);
		await deleteIfExists(FAILED_MARKER_KEY);
		await clearFailedFlag();
		return {
			success: true,
			message:
				'Override file deleted from S3. The current configuration remains active until next restart.'
		};
	},

	restart: async ({ locals }: RequestEvent) => {
		guardOrThrow(locals);
		scheduleExit(EXIT_RESTART);
		return { success: true, message: 'Restart requested. be-BOP is shutting down.' };
	},

	updateLatest: async ({ locals }: RequestEvent) => {
		guardOrThrow(locals);
		scheduleExit(EXIT_UPDATE_LATEST);
		return { success: true, message: 'Update to latest requested. be-BOP is shutting down.' };
	},

	rollback: async ({ request, locals }: RequestEvent) => {
		guardOrThrow(locals);
		const formData = await request.formData();
		const parsed = z
			.object({ k: z.coerce.number().int().min(1).max(ROLLBACK_MAX_STEP) })
			.parse(Object.fromEntries(formData));
		const code = rollbackExitCode(parsed.k);
		scheduleExit(code);
		return {
			success: true,
			message: `Rollback to N-${parsed.k} requested (exit ${code}). be-BOP is shutting down.`
		};
	}
};
