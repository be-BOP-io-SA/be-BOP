import { runtimeConfig } from '$lib/server/runtime-config';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify(runtimeConfig.exchangeRate), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
};
