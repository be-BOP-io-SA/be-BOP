import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import type { ApiKeySuspiciousEvent, ApiKeySuspiciousEventType } from '$lib/types/ApiKey';

/**
 * Flag a key as suspicious and write the call to its journal.
 *
 * The flag only ever goes up here; it comes down by hand, from the key's admin page.
 */
export async function reportSuspiciousCall(
	keyId: ObjectId,
	event: { type: ApiKeySuspiciousEventType; call: string; detail: string }
): Promise<void> {
	const now = new Date();
	const entry: ApiKeySuspiciousEvent = {
		type: event.type,
		at: now,
		call: event.call,
		detail: event.detail
	};
	await collections.apiKeys.updateOne(
		{ _id: keyId },
		{
			$push: { suspiciousEvents: entry },
			// $min keeps the date the key was first flagged, and sets it when there is none.
			$min: { suspiciousAt: now },
			$set: { updatedAt: now }
		}
	);
}

/** The journal of doubtful calls of one key, most recent first. */
export async function listSuspiciousEvents(
	id: ObjectId | string
): Promise<ApiKeySuspiciousEvent[]> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	const key = await collections.apiKeys.findOne({ _id }, { projection: { suspiciousEvents: 1 } });
	return [...(key?.suspiciousEvents ?? [])].reverse();
}

/**
 * Take the suspicious flag off a key. The journal stays: it is the history of the key, and the next
 * doubtful call raises the flag again. Returns false when no key carries that id.
 */
export async function clearSuspiciousFlag(id: ObjectId | string): Promise<boolean> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	const result = await collections.apiKeys.updateOne(
		{ _id },
		{ $unset: { suspiciousAt: '' }, $set: { updatedAt: new Date() } }
	);
	return result.matchedCount > 0;
}
