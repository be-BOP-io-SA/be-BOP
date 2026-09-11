import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Keep this module free of `$lib` aliases so CLI scripts can import it via relative path. */

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

export function generateApiKeySecret(): string {
	const token = randomBytes(SECRET_RANDOM_BYTES).toString('base64url');
	return `bebop_ak_${token}`;
}

/** Non-secret display / lookup prefix: scheme + first 8 chars of the random part. */
export function apiKeyPrefixFromSecret(secret: string): string {
	const match = /^bebop_ak_([A-Za-z0-9_-]+)$/.exec(secret);
	if (!match) {
		return secret.slice(0, 16);
	}
	return `bebop_ak_${match[1].slice(0, 8)}`;
}

export function parseApiKeySecret(secret: string): { validFormat: true } | { validFormat: false } {
	if (!/^bebop_ak_[A-Za-z0-9_-]+$/.test(secret)) {
		return { validFormat: false };
	}
	return { validFormat: true };
}
