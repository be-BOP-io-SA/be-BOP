import type { ObjectId } from 'mongodb';

/**
 * One call to /api/v1, as the shop will read it back.
 *
 * The point is to answer "what did that integration actually send us, and what did we answer" —
 * a question nobody can settle from the order alone once a till and a shop disagree.
 *
 * The credential itself is never here: an entry carries the key's id, its public prefix and its
 * name, never the secret, and no request header other than the user agent.
 */
export interface ApiV1LogEntry {
	_id: ObjectId;
	createdAt: Date;
	/** Absent when the call never authenticated — an unknown or revoked key still leaves a trace. */
	apiKeyId?: ObjectId;
	keyPrefix?: string;
	keyName?: string;
	method: string;
	/** Path without the query string, which is stored beside it. */
	path: string;
	query?: string;
	status: number;
	durationMs: number;
	/** The `error.code` of the envelope, when the answer was a refusal. */
	errorCode?: string;
	clientIp?: string;
	userAgent?: string;
	requestBody?: string;
	responseBody?: string;
	/** At least one of the two bodies was cut to fit. */
	truncated?: boolean;
	/** An event stream: it is still open when the entry is written, so it has no body. */
	stream?: boolean;
}
