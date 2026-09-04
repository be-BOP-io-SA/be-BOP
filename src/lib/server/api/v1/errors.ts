import { json } from '@sveltejs/kit';
import type { ApiV1ErrorCode } from '$lib/types/ApiV1';

export type ApiErrorBody = {
	error: {
		code: ApiV1ErrorCode;
		message: string;
		details?: unknown;
	};
};

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
