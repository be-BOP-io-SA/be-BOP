import { json } from '@sveltejs/kit';
import type { ApiV1ErrorCode } from '$lib/types/ApiV1';

export type ApiErrorBody = {
	error: {
		code: ApiV1ErrorCode;
		message: string;
		details?: unknown;
	};
};

/**
 * The answer for an address the API does not serve, whether no route owns it or the API is off:
 * one body, so that one cannot be told from the other.
 */
export function apiNotFound(): Response {
	return apiError(404, 'NOT_FOUND', 'Not found');
}

export function apiError(
	status: number,
	code: ApiV1ErrorCode,
	message: string,
	details?: unknown,
	headers?: HeadersInit
): Response {
	const body: ApiErrorBody = {
		error: details === undefined ? { code, message } : { code, message, details }
	};
	return json(body, { status, headers });
}
