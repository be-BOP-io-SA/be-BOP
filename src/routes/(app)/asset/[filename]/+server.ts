import { bundledAssetUrl } from '$lib/server/bundled-assets';
import { defaultPictureUrl, isDefaultPictureFile } from '$lib/server/default-picture';
import { error, redirect } from '@sveltejs/kit';

export async function GET({ params }) {
	const url = isDefaultPictureFile(params.filename)
		? await defaultPictureUrl(params.filename)
		: bundledAssetUrl(params.filename);

	if (!url) {
		throw error(404, 'Asset not found');
	}

	throw redirect(302, url);
}
