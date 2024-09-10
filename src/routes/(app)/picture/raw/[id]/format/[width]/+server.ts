import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { collections } from '$lib/server/database';
import { getPrivateS3DownloadLink, getPublicS3DownloadLink } from '$lib/server/s3';

// We prefer to act as a middleman to add cache-control headers
// Chrome could handle caching with redirects but not Firefox
// It should also be faster if minio runs locally
const imageRedirect = false;

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

	if (imageRedirect) {
		return new Response(null, {
			status: 302,
			headers: {
				location: await getPublicS3DownloadLink(format.key, {
					input: {
						ResponseCacheControl: 'max-age=31536000, public, immutable'
					}
				}),
				// Helps with chrome. FF doesn't handle :(
				'cache-control': 'max-age=31536000, public, immutable'
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
