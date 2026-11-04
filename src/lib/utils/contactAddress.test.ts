import { describe, expect, it } from 'vitest';
import { contactAddressPattern, parseContactAddress } from './contactAddress';

// Encodings of 32 bytes of 0x07: valid keys, not anybody's.
const NPUB = 'npub1qurswpc8qurswpc8qurswpc8qurswpc8qurswpc8qurswpc8qursnvjvl7';
const NSEC = 'nsec1qurswpc8qurswpc8qurswpc8qurswpc8qurswpc8qurswpc8qursl6edet';

describe('parseContactAddress', () => {
	it('accepts an email or an npub when both modes are accepted', () => {
		expect(parseContactAddress('jane@example.com', ['email', 'nostr'])).toEqual({
			kind: 'email',
			address: 'jane@example.com'
		});
		expect(parseContactAddress(NPUB, ['email', 'nostr'])).toEqual({ kind: 'npub', address: NPUB });
	});

	it('only accepts the kind of address of a single mode', () => {
		expect(parseContactAddress(NPUB, ['email'])).toEqual({ error: 'invalidEmail' });
		expect(parseContactAddress('jane@example.com', ['nostr'])).toEqual({ error: 'invalidNpub' });
	});

	it('treats anything containing "@" as an email, even when it starts with "npub"', () => {
		expect(parseContactAddress('npubfoo@example.com', ['email', 'nostr'])).toEqual({
			kind: 'email',
			address: 'npubfoo@example.com'
		});
	});

	it('refuses an email without a domain extension', () => {
		expect(parseContactAddress('jane@example', ['email'])).toEqual({ error: 'invalidEmail' });
	});

	it('refuses an npub that does not decode', () => {
		expect(parseContactAddress('npub1notakey', ['nostr'])).toEqual({ error: 'invalidNpub' });
	});

	it('removes a leading "nostr:"', () => {
		expect(parseContactAddress(`nostr:${NPUB}`, ['nostr'])).toEqual({
			kind: 'npub',
			address: NPUB
		});
	});

	it('flags a private key, with or without "nostr:"', () => {
		expect(parseContactAddress(NSEC, ['email', 'nostr'])).toEqual({ error: 'nsec' });
		expect(parseContactAddress(`nostr:${NSEC}`, ['email', 'nostr'])).toEqual({ error: 'nsec' });
	});

	it('reports a missing address', () => {
		expect(parseContactAddress('  ', ['email'])).toEqual({ error: 'missingContactAddress' });
		expect(parseContactAddress(undefined, ['email'])).toEqual({ error: 'missingContactAddress' });
	});
});

describe('contactAddressPattern', () => {
	const matches = (pattern: string, value: string) => new RegExp(`^(?:${pattern})$`).test(value);

	it('follows the accepted modes', () => {
		expect(matches(contactAddressPattern(['email']), 'jane@example.com')).toBe(true);
		expect(matches(contactAddressPattern(['email']), NPUB)).toBe(false);
		expect(matches(contactAddressPattern(['nostr']), NPUB)).toBe(true);
		expect(matches(contactAddressPattern(['nostr']), `nostr:${NPUB}`)).toBe(true);
		expect(matches(contactAddressPattern(['nostr']), 'jane@example.com')).toBe(false);
	});

	it('refuses a private key', () => {
		expect(matches(contactAddressPattern(['email', 'nostr']), NSEC)).toBe(false);
	});
});
