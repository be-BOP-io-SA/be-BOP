import { env } from '$env/dynamic/private';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { error } from '@sveltejs/kit';

export const GET = ({ request, url, locals }) => {
	// A diagnostic for ORIGIN and proxy setup: it echoes the proxy chain, which visitors have no use for.
	if (!locals.user || locals.user.roleId === CUSTOMER_ROLE_ID) {
		throw error(404);
	}

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
