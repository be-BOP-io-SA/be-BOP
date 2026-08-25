import { runtimeConfig } from '$lib/server/runtime-config';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	if (runtimeConfig.hideFromSearchEngines) {
		return new Response(
			`User-agent: *
Disallow: /
`,
			{
				headers: {
					'content-type': 'text/plain'
				}
			}
		);
	} else {
		return new Response(
			`User-agent: *
Disallow: /order/
Disallow: /subscription/
Disallow: /admin/
Disallow: /admin-*/
Disallow: /checkout
Disallow: /cart
Disallow: /login/
Disallow: /orders/
Disallow: /identity/
Disallow: /pos/
`,
			{
				headers: {
					'content-type': 'text/plain'
				}
			}
		);
	}
};
