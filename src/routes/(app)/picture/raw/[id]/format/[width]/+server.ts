import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { collections } from '$lib/server/database';
import { getPrivateS3DownloadLink, getPublicS3DownloadLink } from '$lib/server/s3';
import { S3_PROXY_DOWNLOADS } from '$lib/server/env-config';

// We prefer to act as a middleman to add cache-control headers
// Chrome could handle caching with redirects but not Firefox
// It should also be faster if minio runs locally
const imageRedirect = S3_PROXY_DOWNLOADS !== 'true';

export const GET: RequestHandler = async ({ params }) => {
	const picture = await collections.pictures.findOne({
		_id: params.id,
		'storage.formats.width': +params.width
	});

	if (!picture) {
		throw error(404);
	}

	const format = picture.storage.formats.find((f) => f.width === +params.width);

	if (!format) {
		throw error(500, "Error when finding picture's format");
	}

	const redirectExpiresIn = 7 * 24 * 3600; // 1 year

	if (imageRedirect) {
		return new Response(null, {
			status: 302,
			headers: {
				location: await getPublicS3DownloadLink(format.key, {
					input: {
						ResponseCacheControl: `max-age=31536000, public, immutable`
					},
					expiresIn: redirectExpiresIn
				}),
				// Helps with chrome. Firefox doesn't handle :(
				'cache-control': `max-age=${redirectExpiresIn}, public, immutable`
			}
		});
	} else {
		const link = await getPrivateS3DownloadLink(format.key, {
			input: {
				ResponseCacheControl: 'max-age=31536000, public, immutable'
			}
		});
		const res = await fetch(link);

		// Until we handle/store ETag properly
		const headers = new Headers([...res.headers.entries()].filter(([k]) => k !== 'etag'));

		return new Response(res.body, {
			status: res.status,
			headers
		});
	}
};
