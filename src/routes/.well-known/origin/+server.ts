import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request, url }) => {
	return new Response(
		JSON.stringify(
			{
				headers: {
					Origin: request.headers.get('origin'),
					Host: request.headers.get('host'),

					'X-Forwarded-Host': request.headers.get('x-forwarded-host'),
					'X-Forwarded-Proto': request.headers.get('x-forwarded-proto'),
					'X-Forwarded-For': request.headers.get('x-forwarded-for')
				},
				env: {
					ORIGIN: env.ORIGIN
				},
				url: url.href
			},
			null,
			2
		),
		{
			headers: {
				'content-type': 'application/json'
			}
		}
	);
};
