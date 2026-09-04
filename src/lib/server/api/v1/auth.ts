import type { RequestEvent } from '@sveltejs/kit';
import {
	apiKeyHasScope,
	findApiKeyBySecret,
	isApiKeyUsable,
	touchApiKey
} from '$lib/server/api/keys';
import { apiError } from './errors';
import type { ApiV1Scope, AuthenticatedApiKey } from '$lib/types/ApiV1';

export type { AuthenticatedApiKey };

/** Reject absurd Authorization / X-Api-Key lengths before hashing (DoS / memory). */
export const MAX_API_KEY_SECRET_LENGTH = 256;

function extractApiKeySecret(request: Request): string | null {
	const xApiKey = request.headers.get('x-api-key')?.trim();
	if (xApiKey) {
		return xApiKey;
	}
	const auth = request.headers.get('authorization');
	if (!auth) {
		return null;
	}
	const match = /^Bearer\s+(\S+)$/i.exec(auth.trim());
	return match?.[1] ?? null;
}

/**
 * Authenticate an /api/v1 request. On success sets event.locals.apiKey and returns null.
 * On failure returns a Response to short-circuit the handler.
 */
export async function authenticateApiV1(
	event: RequestEvent,
	requiredScope?: ApiV1Scope
): Promise<Response | null> {
	const secret = extractApiKeySecret(event.request);
	if (!secret) {
		return apiError(401, 'UNAUTHORIZED', 'Missing API key (Authorization Bearer or X-Api-Key)');
	}
	if (secret.length > MAX_API_KEY_SECRET_LENGTH) {
		return apiError(401, 'UNAUTHORIZED', 'Invalid or revoked API key');
	}

	const apiKey = await findApiKeyBySecret(secret);
	if (!apiKey || !isApiKeyUsable(apiKey)) {
		return apiError(401, 'UNAUTHORIZED', 'Invalid or revoked API key');
	}

	if (requiredScope && !apiKeyHasScope(apiKey, requiredScope)) {
		return apiError(403, 'FORBIDDEN', `API key lacks required scope: ${requiredScope}`);
	}

	const authenticated: AuthenticatedApiKey = {
		_id: apiKey._id,
		name: apiKey.name,
		scopes: apiKey.scopes,
		keyPrefix: apiKey.keyPrefix
	};
	event.locals.apiKey = authenticated;

	// Fire-and-forget last-used touch — do not log the secret.
	void touchApiKey(apiKey._id).catch(() => undefined);

	return null;
}

/**
 * Authenticate and return the API key, or a Response to short-circuit.
 * Prefer this over authenticateApiV1 + dead `if (!locals.apiKey)` checks.
 */
export async function requireApiKey(
	event: RequestEvent,
	requiredScope?: ApiV1Scope
): Promise<AuthenticatedApiKey | Response> {
	const authError = await authenticateApiV1(event, requiredScope);
	if (authError) {
		return authError;
	}
	const apiKey = event.locals.apiKey;
	if (!apiKey) {
		return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
	}
	return apiKey;
}
