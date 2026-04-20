// Temporary diagnostic buffer for invalid NIP-57 zap requests.
// In-memory only — cleared on restart. Safe to remove with the debug branch.

export interface InvalidZapEntry {
	at: Date;
	error: string;
	pTag?: string;
	expectedPubkey: string;
	eventId?: string;
	senderPubkey?: string;
	rawNostrParam: string;
}

const MAX_ENTRIES = 20;
const RAW_PARAM_MAX_LEN = 2000;

const entries: InvalidZapEntry[] = [];

export function recordInvalidZap(entry: Omit<InvalidZapEntry, 'at'> & { at?: Date }): void {
	const truncated =
		entry.rawNostrParam.length > RAW_PARAM_MAX_LEN
			? entry.rawNostrParam.slice(0, RAW_PARAM_MAX_LEN) + '…(truncated)'
			: entry.rawNostrParam;
	entries.unshift({ ...entry, rawNostrParam: truncated, at: entry.at ?? new Date() });
	if (entries.length > MAX_ENTRIES) {
		entries.length = MAX_ENTRIES;
	}
}

export function getRecentInvalidZaps(): InvalidZapEntry[] {
	return entries.slice();
}
