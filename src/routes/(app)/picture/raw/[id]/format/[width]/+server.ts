import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { servePictureFormat } from '$lib/server/serve-picture';

export const GET: RequestHandler = async ({ params }) => {
	const width = Number.parseInt(params.width, 10);
	if (!Number.isSafeInteger(width) || width < 1) {
		throw error(404);
	}
	return servePictureFormat(params.id, width);
};
