import { bech32 } from 'bech32';
import { getPublicKey } from 'nostr-tools';
import { z } from 'zod';
import { runtimeConfig } from './runtime-config';

import { env } from '$env/dynamic/private';
const NOSTR_PRIVATE_KEY = env.NOSTR_PRIVATE_KEY;

export const nostrPrivateKey = NOSTR_PRIVATE_KEY;
export let nostrPublicKey = '';
export let nostrPrivateKeyHex = '';
export let nostrPublicKeyHex = '';

if (NOSTR_PRIVATE_KEY) {
	const decoded = bech32.decode(NOSTR_PRIVATE_KEY);
	if (decoded.prefix !== 'nsec') {
		throw new Error('Invalid NOSTR_PRIVATE_KEY');
	}

	nostrPrivateKeyHex = nostrToHex(NOSTR_PRIVATE_KEY);

	const publicKey = getPublicKey(nostrPrivateKeyHex);

	nostrPublicKey = bech32.encode('npub', bech32.toWords(Buffer.from(publicKey, 'hex')));
	nostrPublicKeyHex = nostrToHex(nostrPublicKey);
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
		.refine((npubAddress) => bech32.decodeUnsafe(npubAddress, 90)?.prefix === 'npub', {
			message: 'Invalid npub address'
		});
}

export const nostrRelays = runtimeConfig.nostrRelays;
