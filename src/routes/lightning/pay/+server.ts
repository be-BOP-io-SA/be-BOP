import { isLndConfigured, lndCreateInvoice } from '$lib/server/lnd';
import { phoenixdCreateInvoice } from '$lib/server/phoenixd';
import { runtimeConfig } from '$lib/server/runtime-config';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';
import { error } from '@sveltejs/kit';
import { jwtVerify } from 'jose';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import { getNostrKeys, isNostrConfigured } from '$lib/server/nostr';
import { validateEvent, verifySignature } from 'nostr-tools';

const ZAP_REQUEST_KIND = 9734;

interface ZapRequestValidation {
	valid: boolean;
	error?: string;
	/** Receiver pubkey (hex) from 'p' tag */
	receiverPubkey?: string;
	/** Sender pubkey (hex) from event.pubkey */
	senderPubkey?: string;
	/** Optional event ID being zapped from 'e' tag */
	eventId?: string;
	/** Already decoded zap request JSON string */
	decodedRequest?: string;
}

/**
 * Validate NIP-57 zap request event (kind 9734)
 * Returns extracted data to avoid re-parsing in caller
 */
function validateZapRequest(nostrParam: string): ZapRequestValidation {
	try {
		const decodedRequest = decodeURIComponent(nostrParam);
		const event = JSON.parse(decodedRequest);

		// Must be kind 9734
		if (event.kind !== ZAP_REQUEST_KIND) {
			return { valid: false, error: `Invalid kind ${event.kind}, expected ${ZAP_REQUEST_KIND}` };
		}

		// Validate event signature
		if (!validateEvent(event) || !verifySignature(event)) {
			return { valid: false, error: 'Invalid event signature' };
		}

		// Must have 'p' tag (receiver)
		const pTag = event.tags.find((t: string[]) => t[0] === 'p');
		if (!pTag?.[1]) {
			return { valid: false, error: 'Missing p tag' };
		}

		// Verify 'p' tag matches our pubkey
		const { pubKeyHex } = getNostrKeys();
		if (pTag[1] !== pubKeyHex) {
			return { valid: false, error: 'Zap recipient does not match' };
		}

		// Extract optional 'e' tag (event being zapped)
		const eTag = event.tags.find((t: string[]) => t[0] === 'e');

		return {
			valid: true,
			receiverPubkey: pTag[1],
			senderPubkey: event.pubkey,
			eventId: eTag?.[1],
			decodedRequest
		};
	} catch {
		return { valid: false, error: 'Failed to parse zap request' };
	}
}

export const OPTIONS = () => {
	return new Response(null, {
		headers: {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'GET, HEAD, OPTIONS',
			'access-control-allow-headers': 'Accept, Accept-Language, Content-Language, Content-Type'
		}
	});
};

export const GET = async ({ url }) => {
	if (!isLndConfigured() && !runtimeConfig.phoenixd.lnAddress) {
		throw error(400, 'Lightning is not configured');
	}

	const {
		amount,
		metadata: metadataJwt,
		comment,
		nostr
	} = z
		.object({
			amount: z
				.number({ coerce: true })
				.int()
				.min(1)
				.max(SATOSHIS_PER_BTC * 1000),
			metadata: z.string(),
			comment: z.string().default('Zap !'),
			nostr: z.string().optional() // NIP-57: URL-encoded zap request event
		})
		.parse(Object.fromEntries(url.searchParams));
	const result = await jwtVerify(
		metadataJwt,
		Uint8Array.from(Buffer.from(runtimeConfig.lnurlPayMetadataJwtSigningKey))
	);

	const { metadata } = z
		.object({
			metadata: z.string()
		})
		.parse(result.payload);
	const invoice = isLndConfigured()
		? await lndCreateInvoice(amount, {
				descriptionHash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(metadata)),
				milliSatoshis: true
		  })
		: await phoenixdCreateInvoice(amount / 1000, comment, new ObjectId().toString());

	// NIP-57: Save pending zap if nostr parameter is provided
	if (nostr && isNostrConfigured()) {
		const validation = validateZapRequest(nostr);
		if (validation.valid && validation.receiverPubkey && validation.senderPubkey) {
			try {
				await collections.pendingZaps.insertOne({
					_id: new ObjectId(),
					invoiceId: invoice.r_hash,
					bolt11: invoice.payment_request,
					zapRequest: validation.decodedRequest ?? '',
					receiverPubkey: validation.receiverPubkey,
					senderPubkey: validation.senderPubkey,
					eventId: validation.eventId,
					processor: isLndConfigured() ? 'lnd' : 'phoenixd',
					createdAt: new Date(),
					updatedAt: new Date()
				});
			} catch (err) {
				console.error('Failed to save pending zap:', err);
			}
		} else if (!validation.valid) {
			console.warn('Invalid zap request:', validation.error);
		}
	}

	return new Response(
		JSON.stringify({
			pr: invoice.payment_request,
			routes: []
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
