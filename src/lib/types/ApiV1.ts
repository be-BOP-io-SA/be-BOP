/**
 * Public HTTP API v1 shared types (issue 2687).
 * Lives under $lib/types (not server) so domain models can reference scopes
 * without a server → types import inversion.
 */

/**
 * Two axes, neither implying the other.
 *
 * `pos:*` unlocks the point-of-sale surface and nothing else: the general `orders:read` returns
 * every order including unpaid ones with their full lines, far more than a register needs.
 *
 * `*:stream` is separate from `*:read` because holding a Server-Sent Events connection open is a
 * different privilege from reading a page: it occupies a connection slot and a share of the change
 * stream for as long as it lasts. A credential that may poll is not automatically one that may
 * camp on the server.
 */
export const API_V1_SCOPES = [
	'orders:write',
	'catalog:read',
	'orders:read',
	'orders:stream',
	'pos:read',
	'pos:write',
	'pos:stream'
] as const;
export type ApiV1Scope = (typeof API_V1_SCOPES)[number];

export const API_V1_WARNING_CODES = [
	'PRODUCT_MISSING',
	'AMOUNT_MISMATCH',
	'POS_LABEL_UNKNOWN',
	'PAYMENT_SYNC_FAILED',
	/** The till sent a price that differs from what be-BOP would have charged. */
	'PRICE_OVERRIDE',
	/** A replay of a known externalOrderId carried a different payload. */
	'DUPLICATE_PAYLOAD_MISMATCH'
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
	keyPrefix: string;
};

/** Resource prefix of a scope (`orders:read` → `orders`). */
export function scopeCategory(scope: string): string {
	const i = scope.indexOf(':');
	return i === -1 ? scope : scope.slice(0, i);
}

export type ScopeCategoryGroup = { category: string; scopes: string[] };

/** Group Face A scopes by resource so read+write of the same prefix sit together. */
export function groupScopesByCategory(scopes: readonly string[]): ScopeCategoryGroup[] {
	const map = new Map<string, string[]>();
	for (const scope of scopes) {
		const category = scopeCategory(scope);
		const list = map.get(category) ?? [];
		list.push(scope);
		map.set(category, list);
	}
	return [...map.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([category, grouped]) => ({
			category,
			scopes: [...grouped].sort((a, b) => a.localeCompare(b))
		}));
}
