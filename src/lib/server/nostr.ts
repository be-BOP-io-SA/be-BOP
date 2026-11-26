import { bech32 } from 'bech32';
import {
	getEventHash,
	getPublicKey,
	validateEvent,
	verifySignature,
	type Event
} from 'nostr-tools';
import { z } from 'zod';
import { runtimeConfig } from './runtime-config';
import type { ContactMode } from '$lib/types/ContactMode';
import { parseContactAddress } from '$lib/utils/contactAddress';

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

// A key of any other length, or 32 bytes off the curve, passes the bech32 checksum but cannot be
// used to encrypt a DM, and it would make the notification worker throw on the stored address.
function isWellFormedNpub(address: string): boolean {
	const decoded = bech32.decodeUnsafe(address, 90);
	if (decoded?.prefix !== 'npub') {
		return false;
	}
	try {
		const key = bech32.fromWords(decoded.words);
		return key.length === 32 && isSecp256k1X(BigInt('0x' + Buffer.from(key).toString('hex')));
	} catch {
		return false;
	}
}

const SECP256K1_P = 2n ** 256n - 2n ** 32n - 977n;

/** Whether some point of secp256k1 (y² = x³ + 7 mod p) has this x, by Euler's criterion. */
function isSecp256k1X(x: bigint): boolean {
	if (x >= SECP256K1_P) {
		return false;
	}
	const ySquared = (x ** 3n + 7n) % SECP256K1_P;
	return ySquared === 0n || modPow(ySquared, (SECP256K1_P - 1n) / 2n, SECP256K1_P) === 1n;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
	let result = 1n;
	base %= modulus;
	while (exponent > 0n) {
		if (exponent & 1n) {
			result = (result * base) % modulus;
		}
		base = (base * base) % modulus;
		exponent >>= 1n;
	}
	return result;
}

/**
 * Validates an email or an npub address among the accepted contact modes, with the same rules
 * as the browser (`parseContactAddress`).
 * Returns `{ kind, address }` on success, or `{ error }` with the suffix of a `login.error.*`
 * translation key: 'invalidEmail', 'invalidNpub' or 'invalidContactAddress'.
 */
export function validateEmailOrNpub(
	input: unknown,
	modes: readonly ContactMode[]
): { kind: 'email' | 'npub'; address: string } | { error: string } {
	const result = parseContactAddress(input, modes);
	if ('error' in result) {
		return {
			error:
				result.error === 'nsec' || result.error === 'missingContactAddress'
					? 'invalidContactAddress'
					: result.error
		};
	}
	// The browser only checks the checksum; the stored npub must also be a usable key.
	if (result.kind === 'npub' && !isWellFormedNpub(result.address)) {
		return { error: 'invalidNpub' };
	}
	return result;
}

// nostr-tools' verifySignature checks the signature over the recomputed hash and never compares
// it with event.id, so a relay could replay a signed event under any id it likes.
export function isAuthenticEvent(event: Event): boolean {
	return validateEvent(event) && event.id === getEventHash(event) && verifySignature(event);
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
