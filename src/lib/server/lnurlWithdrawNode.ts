import { runtimeConfig } from '$lib/server/runtime-config';

const PHOENIXD_TIMEOUT_MS = 5000;

/** One GET to the shop's phoenixd, as the withdraw readiness check asks it. */
export async function phoenixdGet(path: string): Promise<Response> {
	return fetch(`${runtimeConfig.phoenixd.url}${path}`, {
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`
		},
		signal: AbortSignal.timeout(PHOENIXD_TIMEOUT_MS)
	});
}
