import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { ApiV1LogEntry } from '$lib/types/ApiV1Log';
import { ObjectId, type AnyBulkWriteOperation } from 'mongodb';

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

/**
 * The be-BOP orders a call concerns: the one named in its address, and every `orderId` found in
 * its bodies, which is the name the API gives an order in everything it reads and writes.
 */
export function orderIdsOfCall(
	pathOrderId: string | undefined,
	bodies: Array<string | undefined>
): string[] {
	const ids = new Set<string>();
	if (pathOrderId) {
		ids.add(pathOrderId);
	}
	for (const body of bodies) {
		const parsed = parseJson(body);
		if (parsed !== undefined) {
			collectOrderIds(parsed, ids);
		}
	}
	return [...ids];
}

function parseJson(body: string | undefined): unknown {
	if (!body) {
		return undefined;
	}
	try {
		return JSON.parse(body);
	} catch {
		return undefined;
	}
}

function collectOrderIds(node: unknown, ids: Set<string>): void {
	if (Array.isArray(node)) {
		for (const item of node) {
			collectOrderIds(item, ids);
		}
		return;
	}
	if (!node || typeof node !== 'object') {
		return;
	}
	for (const [key, value] of Object.entries(node)) {
		if (key === 'orderId' && typeof value === 'string') {
			ids.add(value);
		} else {
			collectOrderIds(value, ids);
		}
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
	const maxSizeMb = runtimeConfig.apiV1Log.maxSizeMb ?? null;
	if (maxSizeMb === null) {
		return;
	}
	pruning = true;
	lastPruneAt = now;
	void pruneApiV1Logs(maxSizeMb * 1024 * 1024)
		.catch((err) => console.error('[api/v1] could not trim the call log', err))
		.finally(() => {
			pruning = false;
		});
}

/**
 * Remove the oldest entries until the journal is back under `maxSizeBytes`, and return how many
 * went.
 *
 * The size is the collection's own data size, and the number of entries to drop is worked out from
 * its average entry size: both are free to read, where measuring the entries one by one would scan
 * the very collection that grew too large. Entries are cut by `_id`, which is unique and follows
 * insertion order, so two calls in the same millisecond cannot blur the cut.
 */
export async function pruneApiV1Logs(maxSizeBytes: number): Promise<number> {
	const [stats] = await collections.apiV1Logs
		.aggregate<{ storageStats: { size: number; avgObjSize?: number } }>([
			{ $collStats: { storageStats: {} } }
		])
		.toArray();
	const size = stats?.storageStats.size ?? 0;
	const averageEntrySize = stats?.storageStats.avgObjSize ?? 0;
	if (size <= maxSizeBytes || averageEntrySize <= 0) {
		return 0;
	}
	const excess = Math.ceil((size - maxSizeBytes) / averageEntrySize);
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

/**
 * One page of the journal, newest first.
 *
 * No total: counting the matching entries would scan a collection that may hold millions of them,
 * on every page shown. Fetching one entry past the page is enough to tell whether an older page
 * exists.
 */
export async function listApiV1Logs(
	query: ApiV1LogQuery
): Promise<{ entries: ApiV1LogEntry[]; hasMore: boolean }> {
	const filter: Record<string, unknown> = {};
	if (query.apiKeyId && ObjectId.isValid(query.apiKeyId)) {
		filter.apiKeyId = new ObjectId(query.apiKeyId);
	}
	if (query.outcome === 'errors') {
		filter.status = { $gte: 400 };
	}

	const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
	const skip = Math.max(query.skip ?? 0, 0);

	const entries = await collections.apiV1Logs
		.find(filter)
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit + 1)
		.toArray();

	return { entries: entries.slice(0, limit), hasMore: entries.length > limit };
}

/**
 * A body with the personal checkout fields of one order erased, the way anonymization erases them
 * on the order itself: a field loses its value, an address field keeps only its country and zip.
 *
 * Only the order carrying `orderId` is touched; the other orders of a list keep their fields. A
 * field is personal when the body says so, or, in shapes that do not say, when its slug is one of
 * `personalSlugs` and it is not a field the caller attached to its own order.
 *
 * Returns undefined when the body names the order but cannot be read back, which is what a body cut
 * to fit the journal looks like: it cannot be rewritten field by field, so it has to go whole.
 */
export function erasePersonalFields(
	body: string,
	orderId: string,
	personalSlugs: Set<string>
): string | undefined {
	const parsed = parseJson(body);
	if (parsed === undefined) {
		return body.includes(orderId) ? undefined : body;
	}
	return eraseInNode(parsed, orderId, personalSlugs) ? JSON.stringify(parsed) : body;
}

function eraseInNode(node: unknown, orderId: string, personalSlugs: Set<string>): boolean {
	if (Array.isArray(node)) {
		let erased = false;
		for (const item of node) {
			erased = eraseInNode(item, orderId, personalSlugs) || erased;
		}
		return erased;
	}
	if (!node || typeof node !== 'object') {
		return false;
	}
	const record = node as Record<string, unknown>;
	if (record.orderId === orderId && Array.isArray(record.customFields)) {
		let erased = false;
		for (const field of record.customFields) {
			erased = erasePersonalField(field, personalSlugs) || erased;
		}
		return erased;
	}
	let erased = false;
	for (const value of Object.values(record)) {
		erased = eraseInNode(value, orderId, personalSlugs) || erased;
	}
	return erased;
}

function erasePersonalField(field: unknown, personalSlugs: Set<string>): boolean {
	if (!field || typeof field !== 'object') {
		return false;
	}
	const row = field as Record<string, unknown>;
	const personal =
		row.isPersonalData === true ||
		(row.source !== 'api' && typeof row.slug === 'string' && personalSlugs.has(row.slug));
	if (!personal) {
		return false;
	}
	let erased = false;
	if (row.address && typeof row.address === 'object') {
		// An absent country or zip stays absent: JSON leaves undefined values out.
		const { country, zip } = row.address as Record<string, unknown>;
		row.address = { country, zip };
		erased = true;
	}
	if (typeof row.value === 'string' && row.value !== '') {
		row.value = '';
		erased = true;
	}
	return erased;
}

/**
 * Erase, in every journal entry that concerns an order, the checkout fields it marks as personal
 * data. Called when the order is anonymized: the journal holds copies of what the API sent and
 * answered about it, and they would otherwise outlive the anonymization.
 */
export async function eraseOrderPersonalDataFromApiV1Logs(
	orderId: string,
	personalSlugs: string[]
): Promise<void> {
	if (!personalSlugs.length) {
		return;
	}
	const slugs = new Set(personalSlugs);
	const entries = collections.apiV1Logs.find(
		{ orderIds: orderId },
		{ projection: { requestBody: 1, responseBody: 1 } }
	);

	let batch: AnyBulkWriteOperation<ApiV1LogEntry>[] = [];
	for await (const entry of entries) {
		const $set: Partial<Pick<ApiV1LogEntry, 'requestBody' | 'responseBody'>> = {};
		const $unset: Partial<Record<'requestBody' | 'responseBody', ''>> = {};
		for (const key of ['requestBody', 'responseBody'] as const) {
			const body = entry[key];
			if (!body) {
				continue;
			}
			const erased = erasePersonalFields(body, orderId, slugs);
			if (erased === undefined) {
				$unset[key] = '';
			} else if (erased !== body) {
				$set[key] = erased;
			}
		}
		if (!Object.keys($set).length && !Object.keys($unset).length) {
			continue;
		}
		batch.push({
			updateOne: {
				filter: { _id: entry._id },
				update: {
					...(Object.keys($set).length && { $set }),
					...(Object.keys($unset).length && { $unset })
				}
			}
		});
		if (batch.length >= 500) {
			await collections.apiV1Logs.bulkWrite(batch);
			batch = [];
		}
	}
	if (batch.length) {
		await collections.apiV1Logs.bulkWrite(batch);
	}
}
