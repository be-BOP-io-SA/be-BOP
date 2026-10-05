import { bech32 } from 'bech32';
import { getPublicKey } from 'nostr-tools';
import { z } from 'zod';
import { runtimeConfig } from './runtime-config';

type NostrKeys = {
	privKey: string;
	privKeyHex: string;
	pubKey: string;
	pubKeyHex: string;
};

let _nostrKeys: NostrKeys | undefined = undefined;

export function isNostrConfigured(): boolean {
	return !!runtimeConfig.nostr.privateKey;
}

function mkNostrKeys({ privateKey }: typeof runtimeConfig.nostr): NostrKeys {
	let privKey;
	try {
		privKey = zodNsec().parse(privateKey);
	} catch (error) {
		throw new Error('Invalid Nostr Private Key');
	}
	const privKeyHex = nostrToHex(privKey);
	const publicKey = getPublicKey(privKeyHex);
	const pubKey = bech32.encode('npub', bech32.toWords(Buffer.from(publicKey, 'hex')));
	const pubKeyHex = nostrToHex(pubKey);
	return { privKey, privKeyHex, pubKey, pubKeyHex };
}

export function getNostrKeys(): NostrKeys {
	if (!_nostrKeys) {
		_nostrKeys = mkNostrKeys(runtimeConfig.nostr);
	}
	return _nostrKeys;
}

export function resetNostrKeys() {
	_nostrKeys = undefined;
}

export function nostrToHex(key: string): string {
	return Buffer.from(bech32.fromWords(bech32.decode(key).words)).toString('hex');
}

export function hexToNpub(hex: string) {
	return bech32.encode('npub', bech32.toWords(Buffer.from(hex, 'hex')));
}

export function zodNpub() {
	return z
		.string()
		.trim()
		.startsWith('npub')
		.refine(isWellFormedNpub, { message: 'Invalid npub address' });
}

// A key of any other length passes the bech32 checksum but cannot be used to encrypt a DM,
// and it would make the notification worker throw on the stored address.
function isWellFormedNpub(address: string): boolean {
	const decoded = bech32.decodeUnsafe(address, 90);
	if (decoded?.prefix !== 'npub') {
		return false;
	}
	try {
		return bech32.fromWords(decoded.words).length === 32;
	} catch {
		return false;
	}
}

/**
 * Validates a string as either a valid email or a valid npub address.
 * Returns `{ address }` on success, or `{ error }` with a specific error key:
 * - 'invalidEmail' if the input contains '@' but is not a valid email
 * - 'invalidNpub' if the input starts with 'npub' but is not a valid npub
 * - 'invalidContactAddress' otherwise
 */
export function validateEmailOrNpub(input: unknown): { address: string } | { error: string } {
	if (typeof input !== 'string' || !input.trim()) {
		return { error: 'invalidContactAddress' };
	}
	const trimmed = input.trim();

	if (trimmed.includes('@')) {
		const result = z.string().email().safeParse(trimmed);
		return result.success ? { address: trimmed } : { error: 'invalidEmail' };
	}

	if (trimmed.startsWith('npub')) {
		const result = zodNpub().safeParse(trimmed);
		return result.success ? { address: result.data } : { error: 'invalidNpub' };
	}

	return { error: 'invalidContactAddress' };
}

export function zodNsec() {
	return z
		.string()
		.trim()
		.startsWith('nsec')
		.refine((nsec) => bech32.decodeUnsafe(nsec, 90)?.prefix === 'nsec', {
			message: 'Invalid nsec address'
		});
}

export const nostrRelays = runtimeConfig.nostrRelays;
