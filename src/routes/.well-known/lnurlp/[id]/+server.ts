import { isLightningConfigured, lndGetInfo } from '$lib/server/lnd';
import { getPrivateS3DownloadLink } from '$lib/server/s3';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';
import { runtimeConfig } from '$lib/server/runtime-config';
import { collections } from '$lib/server/database';
import { SignJWT } from 'jose';
import sharp from 'sharp';
import { error } from '@sveltejs/kit';

export const OPTIONS = () => {
	return new Response(null, {
		headers: {
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'GET, HEAD, OPTIONS',
			'access-control-allow-headers': 'Accept, Accept-Language, Content-Language, Content-Type'
		}
	});
};

export const GET = async ({ params, url }) => {
	if (!isLightningConfigured && !runtimeConfig.phoenixd.lnAddress) {
		throw error(400, 'Lighting is not configured');
	}
	if (isLightningConfigured) {
		const info = await lndGetInfo();

		if (!info.uris.length) {
			throw error(400, 'No public Lightning URI');
		}
	}

	let picture: Buffer | null = null;

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
		picture = rawPicture
			? await sharp(await rawPicture.arrayBuffer())
					.resize(512, 512)
					.png()
					.toBuffer()
			: null;
	} catch {
		console.log('error getting picture for lnurlp');
	}

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
			minSendable: 1,
			maxSendable: SATOSHIS_PER_BTC * 1000,
			metadata
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
