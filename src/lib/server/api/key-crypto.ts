import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Keep this module free of `$lib` aliases so CLI scripts can import it via relative path. */
export type ApiKeySecretEnvironment = 'live' | 'test';

const SECRET_RANDOM_BYTES = 32;

/** Pure helper — SHA-256 hex digest of the secret alone (no pepper/salt). */
export function hashApiKeySecret(secret: string): string {
	return createHash('sha256').update(secret, 'utf8').digest('hex');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
	try {
		const ba = Buffer.from(a, 'utf8');
		const bb = Buffer.from(b, 'utf8');
		if (ba.length !== bb.length) {
			return false;
		}
		return timingSafeEqual(ba, bb);
	} catch {
		return false;
	}
}

export function generateApiKeySecret(environment: ApiKeySecretEnvironment): string {
	const token = randomBytes(SECRET_RANDOM_BYTES).toString('base64url');
	return `bebop_ak_${environment}_${token}`;
}

/** Non-secret display / lookup prefix: scheme + env + first 8 chars of the random part. */
export function apiKeyPrefixFromSecret(secret: string): string {
	const parts = secret.split('_');
	// bebop_ak_{env}_{token}
	if (parts.length < 4) {
		return secret.slice(0, 24);
	}
	const env = parts[2];
	const token = parts.slice(3).join('_');
	return `bebop_ak_${env}_${token.slice(0, 8)}`;
}

export function parseApiKeySecret(
	secret: string
): { validFormat: true; environment: ApiKeySecretEnvironment } | { validFormat: false } {
	const match = /^bebop_ak_(live|test)_([A-Za-z0-9_-]+)$/.exec(secret);
	if (!match) {
		return { validFormat: false };
	}
	return { environment: match[1] as ApiKeySecretEnvironment, validFormat: true };
}
