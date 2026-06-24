import { PUBLIC_VERSION } from '$env/static/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () =>
	new Response(PUBLIC_VERSION, { headers: { 'Content-Type': 'text/plain' } });
