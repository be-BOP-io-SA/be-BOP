import { collections } from '$lib/server/database';
import type { ApiV1LogEntry } from '$lib/types/ApiV1Log';
import { ObjectId } from 'mongodb';

/**
 * How much of a body is kept — as much as is read, so that a body which reaches the log reaches it
 * whole. The journal exists to answer "what did that integration actually send us", and a batch of
 * orders is only ever settled by the line that is in dispute: keeping the head and dropping the
 * tail answers the question for the first orders of a batch and leaves the last ones unaccounted
 * for, which is where a till and a shop usually disagree.
 */
export const MAX_LOGGED_BODY_CHARS = 256_000;

/** Past this, the request body is not even read: it would be buffered only to be thrown away. */
export const MAX_READ_BODY_BYTES = 256_000;

/** Bodies of these content types are text worth keeping. Anything else (images) is not. */
function isLoggableContentType(contentType: string | null): boolean {
	if (!contentType) {
		return false;
	}
	return /^(application\/(json|.*\+json)|text\/plain)/i.test(contentType);
}

export function isEventStream(contentType: string | null): boolean {
	return !!contentType && /^text\/event-stream/i.test(contentType);
}

export function truncateBody(body: string): { body: string; truncated: boolean } {
	if (body.length <= MAX_LOGGED_BODY_CHARS) {
		return { body, truncated: false };
	}
	return { body: body.slice(0, MAX_LOGGED_BODY_CHARS), truncated: true };
}

/** The `error.code` of an API envelope, when the body is one. */
export function errorCodeOf(body: string | undefined): string | undefined {
	if (!body) {
		return undefined;
	}
	try {
		const parsed = JSON.parse(body) as { error?: { code?: unknown } };
		const code = parsed?.error?.code;
		return typeof code === 'string' ? code : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Read a body for the log without disturbing the exchange.
 *
 * Always called on a clone: the original body is the one the route reads, and a stream can only be
 * consumed once. A body that cannot be read is not worth failing a request over.
 */
export async function readBodyForLog(source: Request | Response): Promise<string | undefined> {
	const contentType = source.headers.get('content-type');
	if (!isLoggableContentType(contentType)) {
		return undefined;
	}
	const declaredLength = Number(source.headers.get('content-length') ?? '0');
	if (declaredLength > MAX_READ_BODY_BYTES) {
		return undefined;
	}
	try {
		const text = await source.text();
		return text || undefined;
	} catch {
		return undefined;
	}
}

export type ApiV1LogDraft = Omit<ApiV1LogEntry, '_id' | 'createdAt'>;

/**
 * Write one entry.
 *
 * Fire-and-forget by design: an API call must not fail, nor wait, because the journal is
 * unavailable. A lost entry is a gap in a log; a rejected call is a lost sale.
 */
export function logApiV1Event(draft: ApiV1LogDraft): void {
	void collections.apiV1Logs
		.insertOne({ _id: new ObjectId(), createdAt: new Date(), ...draft })
		.catch((err) => console.error('[api/v1] could not write the call log', err));
}

export type ApiV1LogQuery = {
	apiKeyId?: string;
	/** `errors` keeps 4xx and 5xx only — what an operator looks for first. */
	outcome?: 'all' | 'errors';
	skip?: number;
	limit?: number;
};

export async function listApiV1Logs(
	query: ApiV1LogQuery
): Promise<{ entries: ApiV1LogEntry[]; total: number }> {
	const filter: Record<string, unknown> = {};
	if (query.apiKeyId && ObjectId.isValid(query.apiKeyId)) {
		filter.apiKeyId = new ObjectId(query.apiKeyId);
	}
	if (query.outcome === 'errors') {
		filter.status = { $gte: 400 };
	}

	const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
	const skip = Math.max(query.skip ?? 0, 0);

	const [entries, total] = await Promise.all([
		collections.apiV1Logs.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
		collections.apiV1Logs.countDocuments(filter)
	]);

	return { entries, total };
}
