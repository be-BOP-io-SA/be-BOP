import { getNostrKeys, isNostrConfigured, nostrRelays } from '$lib/server/nostr';
import { error } from '@sveltejs/kit';
import { runtimeConfig } from '$lib/server/runtime-config';

export const OPTIONS = () => {
	return new Response(null, {
		headers: {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'GET, HEAD, OPTIONS',
			'access-control-allow-headers': 'Accept, Accept-Language, Content-Language, Content-Type'
		}
	});
};

export const GET = () => {
	if (!isNostrConfigured()) {
		throw error(404);
	}
	const { pubKeyHex: nostrPublicKeyHex } = getNostrKeys();
	if (!nostrPublicKeyHex) {
		throw error(404);
	}

	return new Response(
		JSON.stringify({
			names: {
				_: nostrPublicKeyHex,
				[runtimeConfig.brandName]: nostrPublicKeyHex
			},
			relays: { [nostrPublicKeyHex]: nostrRelays }
		}),
		{
			headers: {
				'content-type': 'application/json',
				'access-control-allow-origin': '*',
				'access-control-allow-methods': 'GET, HEAD, OPTIONS',
				'access-control-allow-headers': 'Accept, Accept-Language, Content-Language, Content-Type'
			}
		}
	);
};
