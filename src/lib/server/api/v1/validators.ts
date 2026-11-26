/**
 * HTTP conditional-request helpers (RFC 9110 spirit) for Face A GET routes.
 *
 * Wired to the read routes (catalog list/detail, paid-orders poll) via `jsonWithETag`.
 * NOT wired to POST /api/v1/orders — batch writes use (apiKeyId, externalOrderId)
 * idempotency instead. See docs/en/api/v1-architecture.md (#2713).
 */
import { createHash } from 'node:crypto';

/** Opaque strong ETag: quoted hex SHA-256 of the representation bytes/string. */
export function buildStrongETag(payload: string | Buffer | Uint8Array): string {
	const hash = createHash('sha256').update(payload).digest('hex');
	return `"${hash}"`;
}

export type EntityTag = { kind: 'star' } | { kind: 'strong' | 'weak'; value: string; raw: string };

/**
 * Parse a single entity-tag token (e.g. `"abc"`, `W/"abc"`, `*`).
 * Returns null if the token is not a well-formed entity-tag.
 */
export function parseEntityTag(token: string): EntityTag | null {
	const t = token.trim();
	if (!t) {
		return null;
	}
	if (t === '*') {
		return { kind: 'star' };
	}
	const weak = /^W\/"([^"]*)"$/i.exec(t);
	if (weak) {
		return { kind: 'weak', value: weak[1], raw: `W/"${weak[1]}"` };
	}
	const strong = /^"([^"]*)"$/.exec(t);
	if (strong) {
		return { kind: 'strong', value: strong[1], raw: `"${strong[1]}"` };
	}
	return null;
}

/**
 * Parse If-Match / If-None-Match header value into entity-tags.
 * Comma-separated list per RFC 9110; returns null when header absent/empty.
 */
export function parseMatchHeader(header: string | null | undefined): EntityTag[] | null {
	if (header === null || header === undefined) {
		return null;
	}
	const trimmed = header.trim();
	if (!trimmed) {
		return null;
	}
	const parts = trimmed.split(',');
	const tags: EntityTag[] = [];
	for (const part of parts) {
		const tag = parseEntityTag(part);
		if (!tag) {
			// Malformed token → treat whole header as unusable
			return null;
		}
		tags.push(tag);
	}
	return tags.length ? tags : null;
}

export function parseIfMatch(header: string | null | undefined): EntityTag[] | null {
	return parseMatchHeader(header);
}

export function parseIfNoneMatch(header: string | null | undefined): EntityTag[] | null {
	return parseMatchHeader(header);
}

/**
 * Strong comparison (RFC 9110 §8.8.3.2): both tags must be strong and opaque-tag equal.
 * `*` never matches under strong comparison (handled separately by callers for If-Match).
 */
export function strongMatch(a: EntityTag, b: EntityTag): boolean {
	if (a.kind !== 'strong' || b.kind !== 'strong') {
		return false;
	}
	return a.value === b.value;
}

/**
 * Weak comparison: compare opaque-tag ignoring weakness. `*` matches any current entity.
 */
export function weakMatch(a: EntityTag, b: EntityTag): boolean {
	if (a.kind === 'star' || b.kind === 'star') {
		return true;
	}
	return a.value === b.value;
}

/** True if `etag` (current representation) satisfies If-Match (strong comparison, or `*`). */
export function ifMatchSatisfied(
	currentETag: string,
	ifMatchHeader: string | null | undefined
): boolean {
	const tags = parseIfMatch(ifMatchHeader);
	if (!tags) {
		// Absent If-Match → precondition not applicable (caller decides).
		return true;
	}
	const current = parseEntityTag(currentETag);
	if (!current) {
		return false;
	}
	for (const tag of tags) {
		if (tag.kind === 'star') {
			return true;
		}
		if (strongMatch(current, tag)) {
			return true;
		}
	}
	return false;
}

/**
 * True if If-None-Match indicates the client already has the current representation
 * (weak comparison, including `*`). Used for GET → 304 decisions.
 */
export function ifNoneMatchMatchesCurrent(
	currentETag: string,
	ifNoneMatchHeader: string | null | undefined
): boolean {
	const tags = parseIfNoneMatch(ifNoneMatchHeader);
	if (!tags) {
		return false;
	}
	const current = parseEntityTag(currentETag);
	if (!current) {
		return false;
	}
	for (const tag of tags) {
		if (tag.kind === 'star') {
			return true;
		}
		if (weakMatch(current, tag)) {
			return true;
		}
	}
	return false;
}

/**
 * JSON 200 carrying a strong ETag of the exact serialized bytes, short-circuited to a
 * bodyless 304 when If-None-Match already matches (RFC 9110 §13.1.2 / §15.4.5).
 *
 * `Cache-Control: private, no-cache` keeps per-API-key payloads out of shared caches while
 * still letting a client store the representation and revalidate it with the validator.
 * CORS headers are added afterwards by `apiV1Handler`, so they never feed the ETag.
 */
export function jsonWithETag(body: unknown, request: Request, headersInit?: HeadersInit): Response {
	const payload = JSON.stringify(body);
	const etag = buildStrongETag(payload);
	const headers = new Headers(headersInit);
	headers.set('ETag', etag);
	headers.set('Cache-Control', 'private, no-cache');

	if (ifNoneMatchMatchesCurrent(etag, request.headers.get('if-none-match'))) {
		// 304 must not carry a body, and repeats the validator it would have sent on 200.
		return new Response(null, { status: 304, headers });
	}

	headers.set('Content-Type', 'application/json');
	return new Response(payload, { status: 200, headers });
}
