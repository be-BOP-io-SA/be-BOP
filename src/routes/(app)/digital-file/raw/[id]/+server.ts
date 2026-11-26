import { error, redirect } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { getPublicS3DownloadLink } from '$lib/server/s3';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const secretKey = url.searchParams.get('key');
	if (!secretKey) {
		throw error(404, 'Secret key is needed !');
	}
	const digitalFile = await collections.digitalFiles.findOne({
		secret: secretKey
	});

	if (!digitalFile) {
		throw error(404, 'Digital file not found');
	}

	const downloadLink = getPublicS3DownloadLink(digitalFile.storage.key);

	throw redirect(302, await downloadLink);
};
