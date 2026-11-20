import { bech32 } from 'bech32';
import { z } from 'zod';
import type { ContactMode } from '$lib/types/ContactMode';
import { trimPrefix } from './trimPrefix';

/** Suffixes of the `login.error.*` translation keys, plus `nsec` for a pasted private key */
export type ContactAddressError =
	| 'missingContactAddress'
	| 'nsec'
	| 'invalidEmail'
	| 'invalidNpub'
	| 'invalidContactAddress';

export type ParsedContactAddress =
	| { kind: 'email' | 'npub'; address: string }
	| { error: ContactAddressError };

/**
 * Reads an email or an npub typed in a contact address field, among the accepted contact modes.
 *
 * Used by both the browser and the server, so that they always agree:
 * - a leading `nostr:` is removed;
 * - anything containing `@` is an email;
 * - anything starting with `npub` is an npub, checked by decoding it;
 * - anything starting with `nsec` is refused, as it is a private key.
 */
export function parseContactAddress(
	input: unknown,
	modes: readonly ContactMode[]
): ParsedContactAddress {
	const acceptsEmail = modes.includes('email');
	const acceptsNpub = modes.includes('nostr');
	const address = trimPrefix(typeof input === 'string' ? input.trim() : '', 'nostr:');
	const wrongKind: ContactAddressError =
		acceptsEmail && !acceptsNpub
			? 'invalidEmail'
			: acceptsNpub && !acceptsEmail
			? 'invalidNpub'
			: 'invalidContactAddress';

	if (!address) {
		return { error: 'missingContactAddress' };
	}
	if (address.startsWith('nsec')) {
		return { error: 'nsec' };
	}
	if (address.includes('@')) {
		if (!acceptsEmail) {
			return { error: wrongKind };
		}
		return z.string().email().safeParse(address).success
			? { kind: 'email', address }
			: { error: 'invalidEmail' };
	}
	if (address.startsWith('npub')) {
		if (!acceptsNpub) {
			return { error: wrongKind };
		}
		return bech32.decodeUnsafe(address, 90)?.prefix === 'npub'
			? { kind: 'npub', address }
			: { error: 'invalidNpub' };
	}
	return { error: wrongKind };
}

/** Translation key of the message to show for a contact address error */
export function contactAddressErrorKey(error: ContactAddressError): string {
	return error === 'nsec' ? 'login.nsecBlockTitle' : `login.error.${error}`;
}

/**
 * HTML `pattern` approximating the same rules, for a browser that has not run the page's
 * JavaScript yet. The server still applies `parseContactAddress`.
 */
export function contactAddressPattern(modes: readonly ContactMode[]): string {
	const kinds = [
		...(modes.includes('email') ? ['[^@\\s]+@[^@\\s]+\\.[^@\\s]+'] : []),
		...(modes.includes('nostr') ? ['npub1[02-9ac-hj-np-z]+'] : [])
	];
	return `(nostr:)?(${kinds.join('|')})`;
}
