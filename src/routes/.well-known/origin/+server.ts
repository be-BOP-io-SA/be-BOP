import { env } from '$env/dynamic/private';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { json } from '@sveltejs/kit';

function firstValue(header: string | null) {
	return header?.split(',')[0].trim() || undefined;
}

export const GET = ({ request, url, locals }) => {
	const origin = env.ORIGIN ? new URL(env.ORIGIN) : undefined;
	const requestHost =
		firstValue(request.headers.get('x-forwarded-host')) ?? request.headers.get('host');
	const requestProto = firstValue(request.headers.get('x-forwarded-proto'));

	const host = origin?.host === requestHost ? 'match' : 'mismatch';
	const protocol = !requestProto
		? 'unknown'
		: origin?.protocol === `${requestProto}:`
		? 'match'
		: 'mismatch';
	const verdict = { originMatches: host === 'match' && protocol !== 'mismatch', host, protocol };

	// A wrong ORIGIN blocks sign-in, so the verdict is public; the proxy chain is for staff only.
	if (!locals.user || locals.user.roleId === CUSTOMER_ROLE_ID) {
		return json(verdict);
	}

	return json({
		...verdict,
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
	});
};
