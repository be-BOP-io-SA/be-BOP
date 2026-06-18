import { ORIGIN } from '$lib/server/env-config';
import qrcode from 'qrcode';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	return new Response(
		await qrcode.toString(new URL('/ticket/' + params.id, ORIGIN).href, { type: 'svg', margin: 0 }),
		{
			headers: { 'content-type': 'image/svg+xml' },
			status: 200
		}
	);
};
