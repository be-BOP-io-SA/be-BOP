/**
 * Public HTTP API v1 shared types (issue 2687).
 * Lives under $lib/types (not server) so domain models can reference scopes
 * without a server → types import inversion.
 */

export const API_V1_SCOPES = ['orders:write', 'catalog:read', 'orders:read'] as const;
export type ApiV1Scope = (typeof API_V1_SCOPES)[number];

export const API_V1_WARNING_CODES = [
	'PRODUCT_MISSING',
	'AMOUNT_MISMATCH',
	'POS_LABEL_UNKNOWN',
	'PAYMENT_SYNC_FAILED'
] as const;
export type ApiV1WarningCode = (typeof API_V1_WARNING_CODES)[number];

export const API_V1_RESULT_STATUSES = ['created', 'duplicate', 'failed'] as const;
export type ApiV1ResultStatus = (typeof API_V1_RESULT_STATUSES)[number];

export const API_V1_BATCH_STATUSES = ['ok', 'ok_with_warnings', 'ok_with_errors'] as const;
export type ApiV1BatchStatus = (typeof API_V1_BATCH_STATUSES)[number];

export const API_V1_ERROR_CODES = [
	'UNAUTHORIZED',
	'FORBIDDEN',
	'VALIDATION_ERROR',
	'RATE_LIMITED',
	'NOT_FOUND',
	'NOT_IMPLEMENTED',
	'INTERNAL_ERROR',
	'MAINTENANCE'
] as const;
export type ApiV1ErrorCode = (typeof API_V1_ERROR_CODES)[number];

export type ApiV1Warning = {
	code: ApiV1WarningCode;
	message: string;
	productId?: string;
	details?: Record<string, unknown>;
};

export type ApiV1OrderResult = {
	externalOrderId: string;
	status: ApiV1ResultStatus;
	orderId?: string;
	warnings?: ApiV1Warning[];
	error?: {
		code: string;
		message: string;
		details?: Record<string, unknown>;
	};
};

export type ApiV1OrdersWriteResponse = {
	ok: boolean;
	status: ApiV1BatchStatus;
	results: ApiV1OrderResult[];
};

/** Subset of ApiKey attached to event.locals after successful /api/v1 auth. */
export type AuthenticatedApiKey = {
	_id: import('mongodb').ObjectId;
	name: string;
	scopes: ApiV1Scope[];
	environment: import('./ApiKey').ApiKeyEnvironment;
	keyPrefix: string;
};
