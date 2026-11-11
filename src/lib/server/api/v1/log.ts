import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
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

export type ApiV1LogFilter = {
	logSuccesses: boolean;
	logErrors: boolean;
	logUnauthenticated: boolean;
};

/**
 * Whether a call goes to the journal.
 *
 * A call without a valid key answers to `logUnauthenticated` alone, whatever its outcome: that
 * setting exists to spot someone probing the API, and turning errors off must not hide them.
 */
export function shouldLogApiV1Call(
	call: { authenticated: boolean; status: number },
	filter: ApiV1LogFilter
): boolean {
	if (!call.authenticated) {
		return filter.logUnauthenticated;
	}
	return call.status >= 400 ? filter.logErrors : filter.logSuccesses;
}

/**
 * Write one entry.
 *
 * Fire-and-forget by design: an API call must not fail, nor wait, because the journal is
 * unavailable. A lost entry is a gap in a log; a rejected call is a lost sale.
 */
export function logApiV1Event(draft: ApiV1LogDraft): void {
	void collections.apiV1Logs
		.insertOne({ _id: new ObjectId(), createdAt: new Date(), ...draft })
		.then(() => scheduleApiV1LogPrune())
		.catch((err) => console.error('[api/v1] could not write the call log', err));
}

/** How often, at most, a server trims the journal back to its ceiling. */
export const PRUNE_INTERVAL_MS = 60_000;

let lastPruneAt = 0;
let pruning = false;

/**
 * Trim after a write, once a minute at most: trimming on every call would double the cost of
 * journaling. Between two trims the journal may run over its ceiling by a minute of calls.
 */
function scheduleApiV1LogPrune(): void {
	const now = Date.now();
	if (pruning || now - lastPruneAt < PRUNE_INTERVAL_MS) {
		return;
	}
	pruning = true;
	lastPruneAt = now;
	void pruneApiV1Logs(runtimeConfig.apiV1Log.maxEntries)
		.catch((err) => console.error('[api/v1] could not trim the call log', err))
		.finally(() => {
			pruning = false;
		});
}

/**
 * Remove the oldest entries past `maxEntries`, and return how many went.
 *
 * The count is the collection's own estimate: free to read, where counting the documents would
 * scan the very collection that grew too large. Entries are cut by `_id`, which is unique and
 * follows insertion order, so two calls in the same millisecond cannot blur the cut.
 */
export async function pruneApiV1Logs(maxEntries: number): Promise<number> {
	const excess = (await collections.apiV1Logs.estimatedDocumentCount()) - maxEntries;
	if (excess <= 0) {
		return 0;
	}
	const cutoff = await collections.apiV1Logs
		.find({}, { projection: { _id: 1 } })
		.sort({ _id: 1 })
		.skip(excess - 1)
		.limit(1)
		.next();
	if (!cutoff) {
		return 0;
	}
	const { deletedCount } = await collections.apiV1Logs.deleteMany({ _id: { $lte: cutoff._id } });
	return deletedCount;
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
