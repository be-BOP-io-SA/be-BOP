import { bech32 } from 'bech32';
import { describe, expect, it } from 'vitest';
import {
	generatePrivateKey,
	getEventHash,
	getPublicKey,
	getSignature,
	type Event
} from 'nostr-tools';
import { hexToNpub, isAuthenticEvent, validateEmailOrNpub, zodNpub } from './nostr';

const validNpub = hexToNpub('a'.repeat(64));

function npubWithBytes(length: number) {
	return bech32.encode('npub', bech32.toWords(Buffer.alloc(length, 1)));
}

describe('zodNpub', () => {
	it('accepts a 32-byte npub', () => {
		expect(zodNpub().safeParse(validNpub).success).toBe(true);
	});

	it.each([0, 1, 31, 33])('rejects an npub that holds %i bytes', (length) => {
		expect(zodNpub().safeParse(npubWithBytes(length)).success).toBe(false);
	});

	it('rejects another bech32 prefix and a bad checksum', () => {
		expect(zodNpub().safeParse(validNpub.replace('npub', 'nsec')).success).toBe(false);
		expect(
			zodNpub().safeParse(validNpub.slice(0, -1) + (validNpub.endsWith('q') ? 'p' : 'q')).success
		).toBe(false);
	});
});

describe('validateEmailOrNpub', () => {
	it('flags a malformed npub', () => {
		expect(validateEmailOrNpub(npubWithBytes(0))).toEqual({ error: 'invalidNpub' });
	});

	it('returns a valid npub trimmed', () => {
		expect(validateEmailOrNpub(`  ${validNpub} `)).toEqual({ address: validNpub });
	});
});

describe('isAuthenticEvent', () => {
	const privateKey = generatePrivateKey();
	const signed = (() => {
		const event = {
			kind: 4,
			created_at: 1_700_000_000,
			tags: [['p', 'a'.repeat(64)]],
			content: '!add abc 1',
			pubkey: getPublicKey(privateKey)
		} as Event;
		event.id = getEventHash(event);
		event.sig = getSignature(event, privateKey);
		return event;
	})();

	it('accepts a genuine signed event', () => {
		expect(isAuthenticEvent(signed)).toBe(true);
	});

	it('refuses the same event carrying another id', () => {
		expect(isAuthenticEvent({ ...signed, id: 'f'.repeat(64) })).toBe(false);
	});

	it('refuses an event whose content was altered', () => {
		expect(isAuthenticEvent({ ...signed, content: '!add abc 99' })).toBe(false);
	});
});
