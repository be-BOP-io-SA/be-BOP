import { getNostrKeys, isNostrConfigured } from '$lib/server/nostr';
import { getRecentInvalidZaps } from '$lib/server/nostr-debug';

export function load() {
	return {
		expectedPubkey: isNostrConfigured() ? getNostrKeys().pubKeyHex : null,
		entries: getRecentInvalidZaps().map((e) => ({
			at: e.at.toISOString(),
			error: e.error,
			pTag: e.pTag,
			expectedPubkey: e.expectedPubkey,
			eventId: e.eventId,
			senderPubkey: e.senderPubkey,
			rawNostrParam: e.rawNostrParam
		}))
	};
}
