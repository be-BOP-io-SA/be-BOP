import { isLndConfigured, lndGetInfo } from '$lib/server/lnd';
import { getPrivateS3DownloadLink } from '$lib/server/s3';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';
import { runtimeConfig } from '$lib/server/runtime-config';
import { collections } from '$lib/server/database';
import { SignJWT } from 'jose';
import sharp from 'sharp';
import { error } from '@sveltejs/kit';
import { getNostrKeys, isNostrConfigured } from '$lib/server/nostr';
import { rateLimit } from '$lib/server/rateLimit';

export const OPTIONS = () => {
	return new Response(null, {
		headers: {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'GET, HEAD, OPTIONS',
			'access-control-allow-headers': 'Accept, Accept-Language, Content-Language, Content-Type'
		}
	});
};

/** The logo only changes with the shop's picture, and resizing it per request is free CPU to anyone. */
let logoPng: { pictureId: string | undefined; png: Buffer | null } | null = null;

async function logoAsPng(): Promise<Buffer | null> {
	if (logoPng && logoPng.pictureId === runtimeConfig.pictureId) {
		return logoPng.png;
	}
	try {
		const logo = runtimeConfig.pictureId
			? await collections.pictures.findOne({ _id: runtimeConfig.pictureId })
			: null;

		const key = logo?.storage.formats.find(
			(format) => format.width === 512 || format.height === 512
		)?.key;

		const rawPicture = key
			? await fetch(getPrivateS3DownloadLink(key)).then((r) => (r.ok ? r.blob() : null))
			: null;

		// Convert to 512x512 PNG
		const png = rawPicture
			? await sharp(await rawPicture.arrayBuffer())
					.resize(512, 512)
					.png()
					.toBuffer()
			: null;
		// A failed download is retried next time rather than remembered as "no logo".
		if (png || !key) {
			logoPng = { pictureId: runtimeConfig.pictureId, png };
		}
		return png;
	} catch {
		console.log('error getting picture for lnurlp');
		return null;
	}
}

export const GET = async ({ params, url, locals }) => {
	// Generous: a custodial wallet's server fetches on behalf of all its users from one address.
	rateLimit(locals.clientIp, 'lnurlp', 120, { minutes: 1 });

	if (!isLndConfigured() && !runtimeConfig.phoenixd.lnAddress) {
		throw error(400, 'Lighting is not configured');
	}
	if (isLndConfigured()) {
		const info = await lndGetInfo();

		if (!info.uris.length) {
			throw error(400, 'No public Lightning URI');
		}
	}

	const picture = await logoAsPng();

	const metadata = JSON.stringify([
		['text/plain', `Tip ${runtimeConfig.brandName}`],
		// todo: switch to text/email if it matches an existing email address
		['text/identifier', `${params.id}@${url.hostname}`],
		...(picture ? [['image/png;base64', picture.toString('base64')]] : [])
	]);

	const jwt = await new SignJWT({
		metadata: metadata
	})
		.setExpirationTime('1h')
		.setProtectedHeader({ alg: 'HS256' })
		.sign(Buffer.from(runtimeConfig.lnurlPayMetadataJwtSigningKey));

	return new Response(
		JSON.stringify({
			callback: `${url.origin}/lightning/pay?metadata=${encodeURIComponent(jwt)}`,
			tag: 'payRequest',
			// values in millisatoshis
			minSendable: 1000,
			maxSendable: SATOSHIS_PER_BTC * 1000,
			metadata,
			commentAllowed: 280,
			// NIP-57 Zaps
			...(isNostrConfigured() && {
				allowsNostr: true,
				nostrPubkey: getNostrKeys().pubKeyHex
			})
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
