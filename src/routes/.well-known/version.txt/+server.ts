import { env } from '$env/dynamic/public';

const PUBLIC_VERSION = env.PUBLIC_VERSION;

export const GET = () =>
	new Response(PUBLIC_VERSION, { headers: { 'Content-Type': 'text/plain' } });
